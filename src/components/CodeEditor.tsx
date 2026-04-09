import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

export const CodeEditor = ({ value, onChange, language }: CodeEditorProps) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;
    monaco.editor.defineTheme('praxis-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment',    foreground: '444444', fontStyle: 'italic' },
        { token: 'keyword',    foreground: '73E33B', fontStyle: 'bold' },
        { token: 'string',     foreground: 'ffd580' },
        { token: 'number',     foreground: 'ff9f43' },
        { token: 'type',       foreground: '38bdf8' },
        { token: 'function',   foreground: 'c084fc' },
        { token: 'variable',   foreground: 'e8edf5' },
        { token: 'operator',   foreground: '73E33B' },
        { token: 'delimiter',  foreground: '666666' },
      ],
      colors: {
        'editor.background':                '#0a0a0a',
        'editor.foreground':                '#e8e8e8',
        'editor.lineHighlightBackground':   '#111111',
        'editor.selectionBackground':       '#73E33B22',
        'editor.inactiveSelectionBackground':'#73E33B11',
        'editorLineNumber.foreground':      '#333333',
        'editorLineNumber.activeForeground':'#73E33B',
        'editorCursor.foreground':          '#73E33B',
        'editorIndentGuide.background':     '#1a1a1a',
        'editorIndentGuide.activeBackground':'#333333',
        'editorBracketMatch.background':    '#73E33B22',
        'editorBracketMatch.border':        '#73E33B55',
        'scrollbar.shadow':                 '#00000000',
        'scrollbarSlider.background':       '#1a1a1a80',
        'scrollbarSlider.hoverBackground':  '#73E33B22',
        'scrollbarSlider.activeBackground': '#73E33B33',
      },
    });
    monaco.editor.setTheme('praxis-dark');
  }, [monaco]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={val => onChange(val || '')}
      theme="praxis-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: 'off',
        renderLineHighlight: 'line',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          verticalScrollbarSize: 5,
          horizontalScrollbarSize: 5,
        },
        padding: { top: 20, bottom: 20 },
        bracketPairColorization: { enabled: true },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        renderWhitespace: 'none',
        guides: { indentation: true, bracketPairs: true },
      }}
    />
  );
};
