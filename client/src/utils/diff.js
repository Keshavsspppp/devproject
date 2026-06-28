/**
 * Parse a unified-diff `patch` string into renderable line objects.
 * Each line: { type: 'context'|'add'|'del'|'hunk', oldLine, newLine, text }
 */
export function parsePatch(patch = '') {
  const lines = patch.split('\n');
  const out = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    const hunk = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      out.push({ type: 'hunk', text: line });
      continue;
    }
    if (line.startsWith('+++') || line.startsWith('---')) {
      // file headers, usually absent in our stored patches
      continue;
    }
    if (line.startsWith('+')) {
      out.push({ type: 'add', newLine: newLine++, text: line.slice(1) });
    } else if (line.startsWith('-')) {
      out.push({ type: 'del', oldLine: oldLine++, text: line.slice(1) });
    } else if (line.startsWith('\\ No newline')) {
      // trailing marker
    } else {
      out.push({ type: 'context', oldLine: oldLine++, newLine: newLine++, text: line.replace(/^ /, '') });
    }
  }
  return out;
}

export function languageFromPath(path = '') {
  const ext = path.split('.').pop().toLowerCase();
  return {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp',
    cs: 'csharp', php: 'php', sh: 'bash', yml: 'yaml', yaml: 'yaml', json: 'json',
    md: 'markdown', html: 'html', css: 'css', scss: 'scss',
  }[ext] || 'text';
}
