import urllib.request

url = "https://raw.githubusercontent.com/fudan-generative-vision/hallo/main/scripts/inference.py"
with urllib.request.urlopen(url) as response:
    code = response.read().decode('utf-8')

lines = code.splitlines()
for idx, line in enumerate(lines):
    if "ArgumentParser" in line:
        print(f"Starts at: {idx}")
        # Print the next 60 lines
        for j in range(idx, min(idx + 60, len(lines))):
            print(f"{j}: {lines[j]}")
        break
else:
    print("Could not find ArgumentParser in inference.py")
