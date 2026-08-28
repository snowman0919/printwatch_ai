import unittest

from check_env import validate


class CheckEnvTest(unittest.TestCase):
    def valid(self):
        return {
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_" + "live_public",
            "CLERK_SECRET_KEY": "sk_" + "live_secret",
            "OLLAMA_BASE_URL": "http://100.90.167.128:11434/v1",
            "OLLAMA_MODEL": "Qwythos-v2-9B:Q4",
            "DEVICE_TOKENS_JSON": '{"printer-1":"aaaaaaaaaaaaaaaaaaaaaaaa","printer-2":"bbbbbbbbbbbbbbbbbbbbbbbb","printer-3":"cccccccccccccccccccccccc"}',
            "CLOUDFLARE_TUNNEL_TOKEN": "tunnel",
            "CLOUDFLARE_TURN_KEY_ID": "turn-key",
            "CLOUDFLARE_TURN_API_TOKEN": "turn-token",
        }

    def test_accepts_complete_environment(self):
        self.assertEqual(validate(self.valid()), [])

    def test_rejects_shared_or_incomplete_device_tokens(self):
        values = self.valid()
        values["DEVICE_TOKENS_JSON"] = '{"printer-1":"same-same-same-same-same-same","printer-2":"same-same-same-same-same-same"}'
        self.assertIn("DEVICE_TOKENS_JSON must contain exactly printer-1, printer-2, printer-3", validate(values))
        values["DEVICE_TOKENS_JSON"] = '{"printer-1":"same-same-same-same-same-same","printer-2":"same-same-same-same-same-same","printer-3":"same-same-same-same-same-same"}'
        self.assertIn("device tokens must be unique", validate(values))
        values["OLLAMA_MODEL"] = "another-model"
        self.assertIn("OLLAMA_MODEL must be Qwythos-v2-9B:Q4", validate(values))


if __name__ == "__main__":
    unittest.main()
