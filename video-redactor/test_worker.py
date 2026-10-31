"""Regression tests for privacy-safe video handling (no R2 or DB credentials)."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

import cv2
import numpy as np

spec = importlib.util.spec_from_file_location("video_redactor_worker",
    Path(__file__).parent / "worker.py")
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class FakeQr:
    def detectAndDecodeMulti(self, frame):
        return False, [], None, None
    def detect(self, frame):
        return False, None


class PrivacyTests(unittest.TestCase):
    def test_contacts_only(self):
        for phrase in ("Contact us +91 98765 43210", "call 9876543210",
                       "www.company.in", "hello@example.com", "@company_handle",
                       "WhatsApp: +91-9876543210"):
            self.assertTrue(worker.contains_contact(phrase), phrase)
        for phrase in ("Contact Us", "Annual sales 2024", "Our Project",
                       "Standard 3200 sqft", "INR 9999", "3 BHK"):
            self.assertFalse(worker.contains_contact(phrase), phrase)

    def test_only_matching_ocr_words_are_masked(self):
        words = ["Luxury", "interior", "Call", "+91", "98765", "43210", "project"]
        data = {k: [1]*len(words) for k in ("block_num", "par_num", "line_num")}
        data["text"] = words
        data["left"] = [10, 90, 180, 240, 290, 350, 420]
        data["top"] = [10]*len(words)
        data["width"] = [70, 80, 50, 40, 60, 60, 60]
        data["height"] = [20]*len(words)
        with mock.patch.object(worker.pytesseract, "image_to_data", return_value=data):
            boxes = worker.detect_contact_boxes(np.zeros((80, 500, 3), dtype=np.uint8), FakeQr())
        self.assertEqual(boxes, [(240, 10, 410, 30)])

    def test_mosaic_conceals_without_black_rectangle(self):
        frame = np.random.default_rng(42).integers(0, 256, (180, 300, 3), dtype=np.uint8)
        original = frame.copy()
        worker.conceal(frame, [(90, 60, 180, 90)])
        self.assertTrue(np.array_equal(frame[:20], original[:20]))
        self.assertFalse(np.array_equal(frame[55:100, 75:200], original[55:100, 75:200]))
        self.assertGreater(int(np.max(frame[65:90, 90:180])), 0)

    def test_environmental_audio_is_retained(self):
        with tempfile.TemporaryDirectory() as directory:
            source = os.path.join(directory, "input.mp4")
            output = os.path.join(directory, "output.mp4")
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "color=c=black:s=320x240:r=5:d=1",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
                "-shortest", "-pix_fmt", "yuv420p", "-c:v", "libx264", source],
                check=True, timeout=30)
            stats = worker.transcode(source, output)
            probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a",
                "-show_entries", "stream=codec_name", "-of", "csv=p=0", output],
                capture_output=True, text=True, check=True)
            self.assertIn("aac", probe.stdout)
            sound = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel",
                "error", "-i", output, "-vn", "-ar", "16000", "-ac", "1",
                "-f", "s16le", "pipe:1"], capture_output=True, check=True)
            samples = np.frombuffer(sound.stdout, dtype="<i2").astype(np.float32)
            self.assertGreater(float(np.sqrt(np.mean(samples*samples))), 200.)
            self.assertEqual(stats["frames"], 5)

if __name__ == "__main__":
    unittest.main()
