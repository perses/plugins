import React, { useEffect, useRef, useMemo } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { placeholder as placeholderExtension } from '@codemirror/view'
import { startCompletion } from '@codemirror/autocomplete'
import {
  logql,
  createCachedLokiClient,
  type LogQLLanguageConfig,
  type LokiClient
} from '@loki-org/codemirror-logql'

export interface CodeMirrorLogQLEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onEnter?: (value: string) => void
  placeholder?: string
  height?: number | string
  readOnly?: boolean
  lokiURL?: string
  timeRange?: { start: Date; end: Date }
}

export function CodeMirrorLogQLEditor(props: CodeMirrorLogQLEditorProps): React.ReactElement {
  const {
    value,
    onChange,
    onBlur,
    onEnter,
    placeholder = 'Enter LogQL query...',
    height = 100,
    readOnly = false,
    lokiURL,
    timeRange,
  } = props

  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Create Loki client when URL is available - use ref to prevent recreation
  const lokiClientRef = useRef<LokiClient | null>(null)
  const currentLokiURL = useRef<string | undefined>(undefined)

  // Only create new client when URL actually changes
  if (currentLokiURL.current !== lokiURL) {
    currentLokiURL.current = lokiURL
    if (lokiURL) {
      lokiClientRef.current = createCachedLokiClient({
        url: lokiURL,
        cache: {
          ttl: 30000, // 30 seconds cache
          maxSize: 100
        }
      })
      console.log('🔧 Created new Loki client for URL:', lokiURL)
    } else {
      lokiClientRef.current = null
    }
  }

  // Create LogQL language configuration - use stable reference
  const logqlConfig = useMemo((): LogQLLanguageConfig => {
    // Convert timeRange to the format expected by Loki API (ISO strings or Unix timestamps)
    let timeRangeConfig: { start?: string; end?: string } | undefined
    if (timeRange) {
      timeRangeConfig = {
        start: Math.floor(timeRange.start.getTime() / 1000).toString(), // Unix timestamp
        end: Math.floor(timeRange.end.getTime() / 1000).toString() // Unix timestamp
      }
    }

    // Create a callback that always returns the current time range
    const getTimeRange = (): { start?: string; end?: string } | null => {
      if (!timeRange) {
        console.log('🔧 getTimeRange callback: No time range available')
        return null
      }

      const dynamicTimeRange = {
        start: Math.floor(timeRange.start.getTime() / 1000).toString(),
        end: Math.floor(timeRange.end.getTime() / 1000).toString()
      }

      console.log('🔧 getTimeRange callback: Returning dynamic time range:', dynamicTimeRange)
      return dynamicTimeRange
    }

    const config = {
      enableCompletion: true,
      useAsyncCompletion: !!lokiClientRef.current,
      lokiClient: lokiClientRef.current,
      getTimeRange, // Use dynamic callback instead of static timeRange
      enableValidation: true,
      validationMode: 'basic' as const,
      features: {
        completion: true,
        validation: true,
        apiIntegration: !!lokiClientRef.current
      }
    }

    console.log('🔧 Creating LogQL config with:', {
      lokiURL,
      hasLokiClient: !!config.lokiClient,
      useAsyncCompletion: config.useAsyncCompletion,
      hasGetTimeRange: !!config.getTimeRange,
      currentTimeRange: timeRange
    })

    return config
  }, [lokiURL, timeRange]) // Depend on both URL and timeRange

  // Create stable handlers to prevent editor recreation
  const stableOnChange = useRef(onChange)
  const stableOnBlur = useRef(onBlur)
  const stableOnEnter = useRef(onEnter)

  stableOnChange.current = onChange
  stableOnBlur.current = onBlur
  stableOnEnter.current = onEnter

  // Recreate editor when config changes to ensure proper extension setup
  useEffect(() => {
    if (!editorRef.current) return

    // Clean up existing editor
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    console.log('🔧 Creating CodeMirror editor with LogQL config:', {
      hasLokiClient: !!logqlConfig.lokiClient,
      useAsyncCompletion: logqlConfig.useAsyncCompletion,
      apiIntegration: logqlConfig.features?.apiIntegration
    })

    const extensions = [
      basicSetup,
      logql(logqlConfig), // Use the full LogQL language support from the package
      // Add event handlers for better UX
      EditorView.domEventHandlers({
        focus: (event, view) => {
          // Trigger completion immediately on focus if editor is empty or very short
          const text = view.state.doc.toString().trim()
          if (text.length <= 2) {
            setTimeout(() => {
              startCompletion(view)
            }, 100)
          }
        },
        click: (event, view) => {
          // Also trigger on click if editor is empty
          const text = view.state.doc.toString().trim()
          if (text.length === 0) {
            setTimeout(() => {
              startCompletion(view)
            }, 100)
          }
        }
      }),
      EditorView.theme({
        '&': {
          height: typeof height === 'number' ? `${height}px` : height,
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4'
        },
        '.cm-editor': {
          fontSize: '14px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace',
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4'
        },
        '.cm-content': {
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          caretColor: '#d4d4d4'
        },
        '.cm-focused': {
          outline: '2px solid #007acc',
          outlineOffset: '-2px'
        },
        '.cm-editor.cm-readonly': {
          backgroundColor: '#2d2d30',
          color: '#858585'
        },
        '.cm-placeholder': {
          color: '#6a9955'
        },
        '.cm-cursor': {
          borderLeftColor: '#d4d4d4'
        },
        '.cm-selectionBackground': {
          backgroundColor: '#264f78'
        },
        '.cm-activeLine': {
          backgroundColor: '#2a2d2e'
        },
        '.cm-gutters': {
          backgroundColor: '#1e1e1e',
          color: '#858585',
          border: 'none'
        },
        // Dark theme for completion popup
        '.cm-tooltip.cm-tooltip-autocomplete': {
          backgroundColor: '#2d2d30',
          border: '1px solid #3c3c3c',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul': {
          backgroundColor: '#2d2d30',
          border: 'none',
          borderRadius: '6px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace'
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
          color: '#d4d4d4',
          backgroundColor: 'transparent',
          padding: '6px 12px',
          borderRadius: '4px',
          margin: '2px'
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
          backgroundColor: '#007acc',
          color: '#ffffff'
        },
        '.cm-tooltip.cm-tooltip-autocomplete > ul > li:hover': {
          backgroundColor: '#264f78'
        },
        '.cm-completionLabel': {
          color: '#d4d4d4'
        },
        '.cm-completionDetail': {
          color: '#6a9955',
          fontSize: '0.9em'
        },
        '.cm-completionInfo': {
          backgroundColor: '#2d2d30',
          border: '1px solid #3c3c3c',
          color: '#d4d4d4'
        }
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          stableOnChange.current(newValue)
        }
      }),
      EditorState.readOnly.of(readOnly)
    ]

    // Add placeholder if provided
    if (placeholder) {
      extensions.push(placeholderExtension(placeholder))
    }

    // Add keyboard handlers
    if (stableOnEnter.current) {
      extensions.push(
        EditorView.domEventHandlers({
          keydown: (event, view) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              stableOnEnter.current?.(view.state.doc.toString())
              return true
            }
            return false
          }
        })
      )
    }

    if (stableOnBlur.current) {
      extensions.push(
        EditorView.domEventHandlers({
          blur: (event, view) => {
            stableOnBlur.current?.()
          }
        })
      )
    }

    const state = EditorState.create({
      doc: value,
      extensions
    })

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [logqlConfig, height, readOnly, placeholder]) // Only essential props that require recreation

  // Update editor value when prop changes
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      })
    }
  }, [value])

  return (
    <div
      ref={editorRef}
      style={{
        border: '1px solid #3c3c3c',
        borderRadius: '6px',
        backgroundColor: readOnly ? '#2d2d30' : '#1e1e1e'
      }}
    />
  )
}
