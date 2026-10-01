import re

path = 'frontend/lib/dishImages.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'export const DISH_IMAGE_MAP: Record<string, string> = \{([\s\S]*?)\};', text)
if not m:
    print('Pattern not found')
    exit(1)

body = m.group(1)
entries = re.findall(r'"([^"]+)":\s*"([^"]+)"', body)

unique_dict = {}
for k, v in entries:
    k_clean = k.strip().lower()
    if k_clean not in unique_dict:
        unique_dict[k_clean] = v

formatted = 'export const DISH_IMAGE_MAP: Record<string, string> = {\n'
for k, v in unique_dict.items():
    formatted += f'    "{k}": "{v}",\n'
formatted += '};'

new_text = text[:m.start()] + formatted + text[m.end():]
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print(f'Deduplicated DISH_IMAGE_MAP: {len(unique_dict)} unique entries!')
