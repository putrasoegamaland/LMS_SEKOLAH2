'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

// ─── Toolbar config ───

const MATH_BUTTONS = [
    { label: '½', tooltip: 'Pecahan', latex: '\\frac{#0}{#0}' },
    { label: 'x²', tooltip: 'Pangkat', latex: '#@^{#0}' },
    { label: '√', tooltip: 'Akar', latex: '\\sqrt{#0}' },
    { label: 'Σ', tooltip: 'Sigma', latex: '\\sum_{#0}^{#0}' },
]

const SIMPLE_BUTTONS = [
    { label: '×', tooltip: 'Kali', latex: '\\times' },
    { label: '÷', tooltip: 'Bagi', latex: '\\div' },
    { label: 'π', tooltip: 'Pi', latex: '\\pi' },
    { label: '°', tooltip: 'Derajat', latex: '^\\circ' },
    { label: '≥', tooltip: 'Lebih besar ≥', latex: '\\geq' },
    { label: '≤', tooltip: 'Lebih kecil ≤', latex: '\\leq' },
    { label: '≠', tooltip: 'Tidak sama', latex: '\\neq' },
    { label: '∞', tooltip: 'Tak hingga', latex: '\\infty' },
]

// ─── Format conversion ───

/** Convert storage format (text + $latex$ or \(...\)) → MathLive LaTeX */
function toMathLive(source: string): string {
    if (!source) return ''
    if (!source.includes('$') && !source.includes('\\(')) return `\\text{${source}}`

    const parts: string[] = []
    const regex = /\$\$([^$]+)\$\$|\$([^$\n]+)\$|\\\(([^)]+?)\\\)/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(source)) !== null) {
        if (match.index > lastIndex) {
            const text = source.slice(lastIndex, match.index)
            if (text) parts.push(`\\text{${text}}`)
        }
        parts.push(match[1] || match[2] || match[3])
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < source.length) {
        const rest = source.slice(lastIndex)
        if (rest) parts.push(`\\text{${rest}}`)
    }
    return parts.join('')
}

/** Convert MathLive LaTeX → storage format (text + $latex$) */
function fromMathLive(ml: string): string {
    if (!ml) return ''
    if (!ml.includes('\\text{')) {
        return ml.trim() ? `$${ml.trim()}$` : ''
    }

    const parts: string[] = []
    let i = 0
    while (i < ml.length) {
        const textIdx = ml.indexOf('\\text{', i)
        if (textIdx === -1) {
            const remaining = ml.slice(i).trim()
            if (remaining) parts.push(`$${remaining}$`)
            break
        }
        if (textIdx > i) {
            const latex = ml.slice(i, textIdx).trim()
            if (latex) parts.push(`$${latex}$`)
        }
        let braceCount = 0
        let j = textIdx + 6
        while (j < ml.length) {
            if (ml[j] === '{') braceCount++
            else if (ml[j] === '}') {
                if (braceCount === 0) { j++; break }
                braceCount--
            }
            j++
        }
        parts.push(ml.slice(textIdx + 6, j - 1))
        i = j
    }
    return parts.join('')
}

// ─── Component ───

interface MathTextareaProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    rows?: number
    className?: string
}

export default function MathTextarea({ value, onChange, placeholder = 'Tulis pertanyaan...', rows = 3 }: MathTextareaProps) {
    const [mathMode, setMathMode] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mfRef = useRef<any>(null)
    const initRef = useRef(false)
    const lastValueRef = useRef(value)

    // Lazy-initialize MathLive on first toggle
    useEffect(() => {
        if (!mathMode || initRef.current) return
        initRef.current = true

        import('mathlive').then((MathLive) => {
            if (!containerRef.current) return

            const mf = new MathLive.MathfieldElement()

            Object.assign(mf.style, {
                width: '100%',
                minHeight: `${rows * 28 + 16}px`,
                padding: '12px 16px',
                fontSize: '16px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                display: 'block',
                lineHeight: '2',
            })

            mf.setAttribute('virtual-keyboard-mode', 'manual')

            containerRef.current.appendChild(mf)
            mfRef.current = mf

            mf.smartMode = true
            try { mf.menuItems = [] } catch { }

            mf.value = toMathLive(value)
            if (placeholder) mf.placeholder = placeholder

            try { mf.executeCommand(['switchMode', 'text']) } catch { }

            mf.addEventListener('input', () => {
                const converted = fromMathLive(mf.value)
                lastValueRef.current = converted
                onChange(converted)
            })

            mf.addEventListener('beforeinput', (e: InputEvent) => {
                if (e.inputType === 'insertFromPaste') {
                    const text = e.dataTransfer?.getData('text/plain') || ''
                    if (text && (text.includes('\\(') || text.includes('$'))) {
                        e.preventDefault()
                        const converted = toMathLive(text)
                        mf.insert(converted, { mode: 'math' })
                    }
                }
            })

            mf.focus()
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mathMode])

    // Sync value into MathLive when switching to math mode (if already initialized)
    useEffect(() => {
        if (mathMode && mfRef.current && initRef.current) {
            mfRef.current.value = toMathLive(value)
            mfRef.current.focus()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mathMode])

    // Sync external value changes
    useEffect(() => {
        if (mfRef.current && value !== lastValueRef.current) {
            mfRef.current.value = toMathLive(value)
            lastValueRef.current = value
        }
    }, [value])

    const insertMath = useCallback((latex: string) => {
        if (mfRef.current) {
            mfRef.current.insert(latex, { mode: 'math' })
            mfRef.current.focus()
        }
    }, [])

    return (
        <div className="space-y-2">
            {/* Toggle + Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setMathMode(!mathMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer select-none ${mathMode
                            ? 'font-bold text-white bg-blue-600 hover:bg-blue-700'
                            : 'text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100'
                        }`}
                >
                    <span>𝑓𝑥</span>
                    <span>Mode Rumus</span>
                </button>

                {mathMode && (
                    <>
                        <div className="w-px h-6 bg-gray-200" />
                        <span className="text-xs text-text-secondary select-none font-medium">Rumus:</span>
                        {MATH_BUTTONS.map(btn => (
                            <button
                                key={btn.label}
                                type="button"
                                onClick={() => insertMath(btn.latex)}
                                title={btn.tooltip}
                                className="w-9 h-9 flex items-center justify-center text-sm font-semibold bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 active:scale-90 transition-all cursor-pointer select-none text-blue-700"
                            >
                                {btn.label}
                            </button>
                        ))}
                        <div className="w-px h-6 bg-gray-200" />
                        <span className="text-xs text-text-secondary select-none font-medium">Simbol:</span>
                        {SIMPLE_BUTTONS.map(btn => (
                            <button
                                key={btn.label}
                                type="button"
                                onClick={() => insertMath(btn.latex)}
                                title={btn.tooltip}
                                className="w-9 h-9 flex items-center justify-center text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:scale-90 transition-all cursor-pointer select-none"
                            >
                                {btn.label}
                            </button>
                        ))}
                    </>
                )}
            </div>

            {/* Plain textarea — shown when math mode OFF */}
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-4 py-3 bg-secondary/5 border border-secondary/30 rounded-xl text-text-main focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                style={{ display: mathMode ? 'none' : 'block' }}
            />

            {/* MathLive container — shown when math mode ON */}
            <div
                ref={containerRef}
                className="w-full bg-white border border-secondary/30 rounded-xl focus-within:ring-2 focus-within:ring-primary overflow-hidden"
                style={{
                    display: mathMode ? 'block' : 'none',
                    minHeight: `${rows * 28 + 16}px`,
                }}
            />
        </div>
    )
}
