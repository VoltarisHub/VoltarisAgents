import React, { memo, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import {
  Markdown,
  type PartialMarkdownTheme,
  type CodeBlockRendererProps,
} from 'react-native-nitro-markdown';
import CodeHighlighter from 'react-native-code-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  content: string;
  isStreaming: boolean;
  textColor: string;
  codeHeaderColor: string;
  onCopyCode: (code: string) => void;
};

const STREAM_THROTTLE_MS = 100;
const BLOCK_LATEX_REGEX = /\\\[([\s\S]*?)\\\]/g;
const INLINE_LATEX_REGEX = /\\\(([\s\S]*?)\\\)/g;

const normalizeMathDelimiters = (input: string): string => {
  if (!input) return input;
  const withBlockMath = input.replace(BLOCK_LATEX_REGEX, (_match, mathContent) => `$$${String(mathContent).trim()}$$`);
  return withBlockMath.replace(INLINE_LATEX_REGEX, (_match, mathContent) => `$${String(mathContent).trim()}$`);
};

const stabilizeMathDelimiters = (input: string): string => {
  if (!input) return input;
  const singles: number[] = [];
  const doubles: number[] = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\\') { i++; continue; }
    if (input[i] !== '$') continue;
    if (input[i + 1] === '$') { doubles.push(i); i++; } else { singles.push(i); }
  }
  const fixes: Array<{ pos: number; val: string; len: number }> = [];
  if (doubles.length % 2 !== 0) {
    fixes.push({ pos: doubles[doubles.length - 1], val: '\\$\\$', len: 2 });
  }
  if (singles.length % 2 !== 0) {
    fixes.push({ pos: singles[singles.length - 1], val: '\\$', len: 1 });
  }
  if (fixes.length === 0) return input;
  fixes.sort((a, b) => b.pos - a.pos);
  let result = input;
  for (const f of fixes) {
    result = result.slice(0, f.pos) + f.val + result.slice(f.pos + f.len);
  }
  return result;
};

const MATH_OPTIONS = { math: true };

const StreamingContent = memo(({
  content,
  mdTheme,
  renderers,
}: {
  content: string;
  mdTheme: PartialMarkdownTheme;
  renderers: any;
}) => {
  const [display, setDisplay] = useState('');
  const contentRef = useRef(content);
  const lastUpdateRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    contentRef.current = content;
    const flush = () => {
      const text = contentRef.current;
      if (!text) return;
      const normalized = normalizeMathDelimiters(text);
      setDisplay(stabilizeMathDelimiters(normalized));
      lastUpdateRef.current = Date.now();
    };
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - lastUpdateRef.current;
    if (elapsed >= STREAM_THROTTLE_MS) {
      flush();
    } else {
      timerRef.current = setTimeout(flush, STREAM_THROTTLE_MS - elapsed);
    }
  }, [content]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!display) return null;

  return (
    <Markdown
      theme={mdTheme}
      renderers={renderers}
      options={MATH_OPTIONS}
      stylingStrategy="minimal"
    >
      {display}
    </Markdown>
  );
});

const StaticContent = memo(({
  content,
  mdTheme,
  renderers,
}: {
  content: string;
  mdTheme: PartialMarkdownTheme;
  renderers: any;
}) => (
  <Markdown
    theme={mdTheme}
    renderers={renderers}
    options={MATH_OPTIONS}
    stylingStrategy="minimal"
  >
    {content}
  </Markdown>
));

function ChatMarkdown({ content, isStreaming, textColor, codeHeaderColor, onCopyCode }: Props) {
  const mdTheme = useMemo<PartialMarkdownTheme>(() => ({
    colors: {
      text: textColor,
      heading: textColor,
      code: '#fff',
      codeBackground: '#000',
      codeLanguage: '#94a3b8',
      link: '#60a5fa',
      blockquote: textColor,
      border: 'rgba(255,255,255,0.15)',
      surface: 'transparent',
      surfaceLight: 'transparent',
      tableBorder: 'rgba(255,255,255,0.15)',
      tableHeader: 'rgba(255,255,255,0.05)',
      tableHeaderText: textColor,
      tableRowEven: 'transparent',
      tableRowOdd: 'rgba(255,255,255,0.03)',
    },
    spacing: { xs: 2, s: 4, m: 4, l: 8, xl: 12 },
    fontSizes: {
      xs: 12, s: 14, m: 15, l: 16, xl: 17,
      h1: 18, h2: 17, h3: 16, h4: 15, h5: 15, h6: 15,
    },
    fontFamilies: {
      regular: undefined,
      heading: undefined,
      mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    borderRadius: { s: 4, m: 8, l: 12 },
    showCodeLanguage: true,
  }), [textColor]);

  const codeBlockRenderer = useCallback((props: CodeBlockRendererProps) => {
    const { content: code, language } = props;
    return (
      <View style={codeStyles.wrapper}>
        <CodeHighlighter
          hljsStyle={atomOneDark}
          textStyle={codeStyles.text}
          scrollViewProps={{
            style: codeStyles.scroll,
            contentContainerStyle: codeStyles.scrollContent,
          }}
          {...({ language: language || 'text' } as any)}
        >
          {code || ''}
        </CodeHighlighter>
        <TouchableOpacity
          style={codeStyles.copyBtn}
          onPress={() => onCopyCode(code)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialCommunityIcons
            name="content-copy"
            size={14}
            color={codeHeaderColor}
          />
        </TouchableOpacity>
      </View>
    );
  }, [onCopyCode, codeHeaderColor]);

  const renderers = useMemo(() => ({
    code_block: codeBlockRenderer,
  }), [codeBlockRenderer]);

  const trimmed = content?.trim() || '';
  if (!trimmed) return null;

  if (isStreaming) {
    return (
      <StreamingContent
        content={trimmed}
        mdTheme={mdTheme}
        renderers={renderers}
      />
    );
  }

  return (
    <StaticContent
      content={normalizeMathDelimiters(trimmed)}
      mdTheme={mdTheme}
      renderers={renderers}
    />
  );
}

const codeStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    position: 'relative',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scroll: {
    backgroundColor: '#000',
  },
  scrollContent: {
    backgroundColor: '#000',
  },
  copyBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
});

export default memo(ChatMarkdown);
