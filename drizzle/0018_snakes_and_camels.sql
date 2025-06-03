CREATE OR REPLACE FUNCTION to_camel_case(snake_str TEXT) RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    word TEXT;
    words TEXT[];
BEGIN
    words := string_to_array(snake_str, '_');
    result := words[1];

    FOR i IN 2..array_length(words, 1) LOOP
            word := words[i];
            result := result || upper(substring(word, 1, 1)) || substring(word, 2);
        END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION jsonb_snake_to_camel(j JSONB) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::jsonb;
    key TEXT;
    camel_key TEXT;
    value JSONB;
BEGIN
    FOR key, value IN SELECT * FROM jsonb_each(j) LOOP
            camel_key := to_camel_case(key);
            result := result || jsonb_build_object(camel_key, value);
        END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
