"""Verify project videos retain their original frames and music."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("video_processor",
    Path(__file__).parent / "worker.py")
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def stream_hash(path, media_type):
    result = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error",
        "-i", str(path), "-map", f"0:{media_type}:0",
        "-c", "copy", "-f", "hash", "-hash", "SHA256", "pipe:1"],
        check=True, capture_output=True, text=True, timeout=40)
    return result.stdout.strip()


class VideoPreservationTests(unittest.TestCase):
    def test_preserves_original_music_and_picture_bit_exact(self):
        with tempfile.TemporaryDirectory() as directory:
            src = Path(directory) / "source.mp4"
            out = Path(directory) / "output.mp4"
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error",
                "-y", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=12:duration=2",
                "-f", "lavfi", "-i", "sine=frequency=660:duration=2",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
                "-shortest", str(src)], check=True, timeout=40)
            result = worker.transcode(src, out)
            self.assertEqual(result["video"], "unchanged")
            self.assertEqual(result["audio"], "original retained")
            self.assertEqual(stream_hash(src, "v"), stream_hash(out, "v"))
            self.assertEqual(stream_hash(src, "a"), stream_hash(out, "a"))

    def test_without_audio_no_music_added(self):
        with tempfile.TemporaryDirectory() as directory:
            src = Path(directory) / "silent.mp4"
            out = Path(directory) / "output.mp4"
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error",
                "-y", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=12:duration=1",
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                str(src)], check=True, timeout=40)
            result = worker.transcode(src, out)
            self.assertEqual(result["audio"], "no source track")
            self.assertFalse(any(s["codec_type"] == "audio"
                for s in worker.probe_streams(out)["streams"]))

    def test_unsupported_codecs_are_converted_without_masking(self):
        with tempfile.TemporaryDirectory() as directory:
            src = Path(directory) / "source.webm"
            out = Path(directory) / "output.mp4"
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error",
                "-y", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=12:duration=1",
                "-f", "lavfi", "-i", "sine=frequency=400:duration=1",
                "-c:v", "libvpx", "-b:v", "400k", "-c:a", "libopus",
                "-shortest", str(src)], check=True, timeout=40)
            stats = worker.transcode(src, out)
            self.assertEqual(stats["video"], "browser encoded")
            self.assertEqual(stats["audio"], "original re-encoded")
            info = worker.probe_streams(out)
            self.assertEqual(next(s["codec_name"] for s in info["streams"]
                if s["codec_type"]=="video"), "h264")
            self.assertEqual(next(s["codec_name"] for s in info["streams"]
                if s["codec_type"]=="audio"), "aac")


if __name__ == "__main__":
    unittest.main()
