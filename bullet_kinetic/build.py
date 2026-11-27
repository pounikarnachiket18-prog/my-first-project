"""Inline the fonts into src/bullet_kinetic.src.html -> bullet_kinetic.html (one standalone file)."""
import base64, pathlib, re
here = pathlib.Path(__file__).parent
src = (here / 'src' / 'bullet_kinetic.src.html').read_text(encoding='utf-8')
def inline(m):
    data = base64.b64encode((here / m.group(1)).read_bytes()).decode()
    return f'url(data:font/woff2;base64,{data})'
out = re.sub(r'url\((fonts/[\w.-]+\.woff2)\)', inline, src)
(here / 'bullet_kinetic.html').write_text(out, encoding='utf-8')
print('wrote bullet_kinetic.html', len(out) // 1024, 'KB')
