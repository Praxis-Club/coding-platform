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
    monaco.editor.defineTheme('code7-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment',    foreground: '4a5568', fontStyle: 'italic' },
        { token: 'keyword',    foreground: '00ff88', fontStyle: 'bold' },
        { token: 'string',     foreground: 'ffd580' },
        { token: 'number',     foreground: 'ff9f43' },
        { token: 'type',       foreground: '38bdf8' },
        { token: 'function',   foreground: 'c084fc' },
        { token: 'variable',   foreground: 'e8edf5' },
        { token: 'operator',   foreground: '00ff88' },
        { token: 'delimiter',  foreground: '8892a4' },
      ],
      colors: {
        'editor.background':           '#080b10',
        'editor.foreground':           '#e8edf5',
        'editor.lineHighlightBackground': '#0d1117',
        'editor.selectionBackground':  '#00ff8820',
        'editor.inactiveSelectionBackground': '#00ff8810',
        'editorLineNumber.foreground': '#2d3748',
        'editorLineNumber.activeForeground': '#00ff88',
        'editorCursor.foreground':     '#00ff88',
        'editorIndentGuide.background':'#1a2230',
        'editorIndentGuide.activeBackground': '#2d3748',
        'editorBracketMatch.background': '#00ff8820',
        'editorBracketMatch.border':   '#00ff8860',
        'scrollbar.shadow':            '#00000000',
        'scrollbarSlider.background':  '#1a223080',
        'scrollbarSlider.hoverBackground': '#2d374880',
        'scrollbarSlider.activeBackground': '#00ff8830',
      },
    });
    monaco.editor.setTheme('code7-dark');
  }, [monaco]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={val => onChange(val || '')}
      theme="code7-dark"
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
