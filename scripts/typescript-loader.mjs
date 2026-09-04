import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export async function resolve(specifier, context, nextResolve) {
  let candidate;

  if (specifier.startsWith('~/')) {
    candidate = path.join(projectRoot, 'app', specifier.slice(2));
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    candidate = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  if (candidate && !path.extname(candidate) && existsSync(`${candidate}.ts`)) {
    return { url: pathToFileURL(`${candidate}.ts`).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
      },
      fileName: fileURLToPath(url),
    });
    return { format: 'module', source: output.outputText, shortCircuit: true };
  }

  return nextLoad(url, context);
}
