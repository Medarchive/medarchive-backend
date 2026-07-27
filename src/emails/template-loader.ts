import { readFileSync } from 'fs';
import { join } from 'path';

export function loadTemplate(name: string, vars: Record<string, string>): string {
  const path = join(__dirname, 'templates', `${name}.html`);
  let html = readFileSync(path, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}
