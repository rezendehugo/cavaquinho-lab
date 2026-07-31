import unittest

from dev_server import production_source


class DevelopmentWatcherTests(unittest.TestCase):
    def test_restarts_only_for_runtime_python_sources(self) -> None:
        for name in ("server.py", "pipeline.py", "normalize.py"):
            self.assertTrue(production_source(None, f"/app/{name}"))
        for name in ("test_pipeline.py", "test_corpus.py", "README.md", "requirements.txt"):
            self.assertFalse(production_source(None, f"/app/{name}"))


if __name__ == "__main__":
    unittest.main()
