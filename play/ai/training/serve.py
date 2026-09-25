"""Private, bounded CPU inference service. Never runs an optimizer or writes models."""
from resource_budget import requested_cpu_limit, restrict_resources
restrict_resources(requested_cpu_limit())
import argparse
import base64
from collections import OrderedDict
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import threading
import io
import json
import os
import zipfile
import torch
from full_model import compact, make_policy, act

MAX_BODY = 48_000_000
MAX_MODEL = 32_000_000


def interface_hash(contract):
    document = {key: contract.get(key) for key in ('protocol', 'commandAdapter', 'encoding', 'specialists')}
    return hashlib.sha256(json.dumps(document, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


class ModelUnavailable(Exception):
    pass


class ModelBusy(Exception):
    pass


class ModelCache:
    def __init__(self, maximum=16):
        self.maximum = maximum
        self.models = OrderedDict()
        self.guard = threading.RLock()
        self.loading = threading.RLock()

    def load(self, release, data):
        if len(data) > MAX_MODEL or len(data) != release['artifact']['bytes'] or hashlib.sha256(data).hexdigest() != release['artifact']['sha256']:
            raise ValueError('Model integrity mismatch')
        if release['architecture'] not in ('crossfire-specialists-v1', 'crossfire-specialists-v2'):
            raise ValueError('Unsupported architecture')
        contract = release['contract']
        if (interface_hash(contract) != release['interfaceHash'] or
                not 1 <= contract['encoding']['contextSize'] <= 100_000 or
                not 1 <= contract['encoding']['candidateSize'] <= 20_000 or
                len(contract['encoding']['vocabulary']) > 4096 or
                not 2 <= len(contract['decks']) <= 32):
            raise ValueError('Unsupported model interface')
        resident = self.resident(release)
        if resident is not None:
            return resident
        if not self.loading.acquire(timeout=20):
            raise ModelBusy('Another model is loading')
        try:
            # Another loader may have installed this release while we waited.
            resident = self.resident(release)
            if resident is not None:
                return resident
            return self.load_cold(release, data)
        finally:
            self.loading.release()

    def resident(self, release):
        with self.guard:
            if release['id'] in self.models:
                previous, policy = self.models[release['id']]
                if previous != release:
                    raise ValueError('Immutable release changed')
                self.models.move_to_end(release['id'])
                return {'parameters': sum(p.numel() for p in policy.parameters())}
        return None

    def load_cold(self, release, data):
        contract = release['contract']
        specialists = contract.get('specialists')
        if specialists and (len(specialists['leaders']) > 32 or len(specialists['strategies']) > 16):
            raise ValueError('Specialist topology exceeds capacity')
        # PyTorch ZIP tensors are bounded before deserialization; only tensor and
        # primitive payloads are permitted, never arbitrary Python objects.
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if sum(item.file_size for item in archive.infolist()) > 128_000_000 or len(archive.infolist()) > 4096:
                raise ValueError('Model expansion exceeds capacity')
        payload = torch.load(io.BytesIO(data), map_location='cpu', weights_only=True)
        if (payload.get('games') != release['games'] or payload.get('updates') != release['updates'] or
                payload.get('datasets', []) != release.get('datasets', [])):
            raise ValueError('Training provenance mismatch')
        if payload.get('contract') != contract or payload.get('architecture') != release['architecture']:
            raise ValueError('Model contract mismatch')
        with torch.random.fork_rng(devices=[]):
            policy = make_policy(contract, release['architecture'])
        if payload.get('policySpec') != policy.spec:
            raise ValueError('Model routing mismatch')
        policy.load_state_dict(payload['model'], strict=True)
        if any(not torch.isfinite(p).all() for p in policy.parameters()):
            raise ValueError('Non-finite model weights')
        leader = next((l for l in policy.roster['leaders'] if l['key'] == release['leader']['key']), None)
        if not leader or leader['cardId'] != release['leader']['cardId']:
            raise ValueError('Unknown leader')
        decks = {d['key']: d for d in policy.decks if d['leaderKey'] == leader['key']}
        for deck in release['decks']:
            if deck['key'] not in decks or decks[deck['key']]['strategies'] != deck['archetypes']:
                raise ValueError('Deck routing mismatch')
            if not any(d['key'] == deck['key'] and d['hash'] == deck['hash'] for d in contract['decks']):
                raise ValueError('Deck hash mismatch')
        if not release['decks']:
            raise ValueError('No qualified decks')
        policy.eval().requires_grad_(False)
        with self.guard:
            self.models[release['id']] = (release, policy)
            self.models.move_to_end(release['id'])
            while len(self.models) > self.maximum:
                self.models.popitem(last=False)
        return {'parameters': sum(p.numel() for p in policy.parameters())}

    def choose(self, request):
        with self.guard:
            item = self.models.get(request['releaseId'])
            if item is not None: self.models.move_to_end(request['releaseId'])
        if item is None:
            raise ModelUnavailable('Model needs reloading')
        release, policy = item
        if not any(e['versions'] == request['versions'] for e in release['evaluations']):
            raise ValueError('Uncertified engine/card target')
        observation = compact(request['observation'], release['contract'])
        if len(observation['candidates']) > 10_000:
            raise ValueError('Too many action candidates')
        context = torch.from_numpy(observation['context']).unsqueeze(0)
        if policy.leader_keys[int(policy.routes(context)[0])] != release['leader']['key']:
            raise ValueError('Release cannot serve this leader')
        route = int(policy.list_routes(context)[0])
        if route >= len(policy.decks) or (policy.decks[route]['key'] != request['deckKey'] or request['deckKey'] not in {d['key'] for d in release['decks']}):
            raise ValueError('Release cannot serve this deck')
        action, _, value = act(policy, observation, greedy=True)
        return {'action': action, 'value': value, 'releaseId': release['id'], 'artifact': release['artifact']['sha256']}


def serve(host, port, token, cache=None):
    if len(token) < 32:
        raise ValueError('CROSSFIRE_AI_INFERENCE_TOKEN must contain at least 32 characters')
    cache = cache or ModelCache()
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            self.request.settimeout(15)
            super().setup()

        def log_message(self, *_):
            pass  # Never log request bodies, credentials or private observations.

        def reply(self, status, body):
            data = json.dumps(body, allow_nan=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            try: self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError): pass

        def do_GET(self):
            self.reply(200 if self.path == '/health' else 404, {'ready': self.path == '/health'})

        def do_POST(self):
            self.connection.settimeout(15)
            if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                return self.reply(403, {'message': 'Forbidden'})
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= MAX_BODY or self.headers.get('Transfer-Encoding'):
                    raise ValueError('Invalid request size')
                data = self.rfile.read(size)
                if len(data) != size: raise ValueError('Incomplete request')
                raw = json.loads(data)
                if self.path == '/load':
                    result = cache.load(raw['release'], base64.b64decode(raw['weights'], validate=True))
                elif self.path == '/choose':
                    result = cache.choose(raw)
                else:
                    return self.reply(404, {'message': 'Unknown operation'})
                self.reply(200, result)
            except ModelBusy:
                self.reply(503, {'message': 'AI inference service is busy'})
            except ModelUnavailable:
                self.reply(409, {'message': 'Model unavailable; reload its pinned release'})
            except Exception:
                self.reply(422, {'message': 'Model or inference request failed validation'})
    class Server(ThreadingMixIn, HTTPServer):
        daemon_threads = True
        request_queue_size = 8
        capacity = threading.BoundedSemaphore(4)

        def process_request(self, request, address):
            if not self.capacity.acquire(blocking=False):
                try: request.sendall(b'HTTP/1.0 503 Service Unavailable\r\nContent-Length: 0\r\n\r\n')
                finally: self.shutdown_request(request)
                return
            try: super().process_request(request, address)
            except BaseException:
                self.capacity.release(); raise

        def process_request_thread(self, request, address):
            try: super().process_request_thread(request, address)
            finally: self.capacity.release()
    return Server((host, port), Handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument('--cpus', type=int, choices=range(1, 10), default=3)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=3120)
    args = parser.parse_args()
    torch.set_num_threads(1)
    serve(args.host, args.port, os.environ.get('CROSSFIRE_AI_INFERENCE_TOKEN', '')).serve_forever()
