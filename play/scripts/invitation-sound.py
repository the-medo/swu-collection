"""Generate Crossfire's original short saber-like invitation cue (no samples).
Usage: python3 play/scripts/invitation-sound.py output.wav
"""
import math
import random
import struct
import sys
import wave

rate = 24000
rng = random.Random(4419)
phase = 0.0
samples = []
noise = 0.0
for i in range(int(rate * 0.8)):
    t = i / rate
    envelope = (1 - math.exp(-t * 65)) * math.exp(-t * 5) * min(1, (0.8 - t) * 20)
    frequency = 100 + 115 * math.exp(-t * 10) + 35 * math.sin(t * 8)
    phase += math.tau * frequency / rate
    noise = 0.74 * noise + 0.26 * rng.uniform(-1, 1)
    hum = math.sin(phase) + 0.3 * math.sin(phase * 2.01) + 0.12 * math.sin(phase * 4)
    swish = noise * math.sin(math.pi * min(1, t / 0.42)) * 1.5
    samples.append(envelope * (hum * 0.22 + swish * 0.55))
with wave.open(sys.argv[1], 'wb') as output:
    output.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    output.writeframes(b''.join(struct.pack('<h', int(s * 24000)) for s in samples))
