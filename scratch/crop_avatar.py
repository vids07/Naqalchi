import cv2
import mediapipe as mp
import numpy as np

img = cv2.imread("public/priya_avatar.png")
h, w = img.shape[:2]

mp_face_mesh = mp.solutions.face_mesh
with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True) as face_mesh:
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = face_mesh.process(rgb)
    if res.multi_face_landmarks:
        landmarks = res.multi_face_landmarks[0].landmark
        # indices 10 and 152 are forehead top and chin bottom
        y_top = landmarks[10].y * h
        y_bottom = landmarks[152].y * h
        face_h = y_bottom - y_top
        
        x_center = (landmarks[234].x + landmarks[454].x) / 2.0 * w
        y_center = (y_top + y_bottom) / 2.0
        
        # We want the face height to be 60% of the cropped frame height.
        # So: face_h = 0.60 * crop_size => crop_size = face_h / 0.60
        crop_size = int(face_h / 0.60)
        
        # Let's crop centered at (x_center, y_center)
        x1 = int(x_center - crop_size / 2)
        y1 = int(y_center - crop_size / 2)
        x2 = x1 + crop_size
        y2 = y1 + crop_size
        
        # Padding if out of bounds
        pad_y1 = max(0, -y1)
        pad_x1 = max(0, -x1)
        pad_y2 = max(0, y2 - h)
        pad_x2 = max(0, x2 - w)
        
        img_padded = cv2.copyMakeBorder(img, pad_y1, pad_y2, pad_x1, pad_x2, cv2.BORDER_REPLICATE)
        
        cropped = img_padded[y1+pad_y1 : y2+pad_y1, x1+pad_x1 : x2+pad_x1]
        # Resize to exactly 512x512 to ensure perfect 1:1 format and fast processing
        cropped_resized = cv2.resize(cropped, (512, 512))
        
        cv2.imwrite("test_face.jpg", cropped_resized)
        print("SUCCESS: Programmatically generated test_face.jpg with exact 60% face proportion and 1:1 aspect ratio!")
    else:
        print("No face detected in public/priya_avatar.png")
