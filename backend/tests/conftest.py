import os
from pathlib import Path
from tempfile import TemporaryDirectory

folder = TemporaryDirectory(ignore_cleanup_errors=True)
os.environ["DATABASE_URL"] = "sqlite:///" + (Path(folder.name) / "test.db").as_posix()
os.environ["LLM_PROVIDER"] = "local"
