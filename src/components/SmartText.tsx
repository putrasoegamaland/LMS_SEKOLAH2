'use client'

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Check if text contains Arabic characters
function containsArabic(text: string): boolean {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

// Check if text contains LaTeX patterns (explicit $ delimiters OR raw commands)
function containsLatex(text: string): boolean {
    return /\$\$.+?\$\$|\$.+?\$|\\(?:frac|sqrt|log|ln|sin|cos|tan|sec|csc|cot|int|sum|prod|lim|infty|alpha|beta|gamma|delta|theta|pi|sigma|omega|times|div|pm|mp|leq|geq|neq|approx|cdot|ldots|vec|hat|bar|overline|underline|text|mathrm|mathbf|binom|left|right|begin|end)\b/.test(text)
}

// Check for raw LaTeX patterns without $ delimiters (like \log_2, x^2, \frac{}{})
function containsRawLatex(text: string): boolean {
    return /\\(?:frac|sqrt|log|ln|sin|cos|tan|sec|csc|cot|int|sum|prod|lim|infty|alpha|beta|gamma|delta|theta|pi|sigma|omega|times|div|pm|mp|leq|geq|neq|approx|cdot|ldots|vec|hat|bar|overline|underline|text|mathrm|mathbf|binom|left|right|begin|end)\b/.test(text)
}

// Render LaTeX expressions in text, returning HTML string
function renderLatexInText(text: string): string {
    // First handle block math ($$...$$)
    let result = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
        // Fix common matrix issue: single backslash at end of line instead of double
        // handle both real newlines and literal \n string
        let cleanExpr = expr.replace(/(?<!\\)\\(?:\s*[\n\r]|\s*\\n)/g, '\\\\ ')

        try {
            return `<div class="katex-block">${katex.renderToString(cleanExpr.trim(), { displayMode: true, throwOnError: false, trust: true })}</div>`
        } catch (e) {
            return `$$${expr}$$`
        }
    })

    // Then handle inline math ($...$) - allow newlines for matrices etc.
    result = result.replace(/\$((?:[^\$]|\\\$)+?)\$/g, (_, expr) => {
        // Fix common matrix issue: single backslash at end of line instead of double
        // handle both real newlines and literal \n string
        let cleanExpr = expr.replace(/(?<!\\)\\(?:\s*[\n\r]|\s*\\n)/g, '\\\\ ')

        try {
            return katex.renderToString(cleanExpr.trim(), { displayMode: false, throwOnError: false, trust: true })
        } catch (e) {
            return `$${expr}$`
        }
    })

    return result
}

// Auto-wrap raw LaTeX expressions and render
function renderRawLatexInText(text: string): string {
    // Match segments that contain LaTeX commands with their arguments
    // This handles patterns like: \log_2(x-1), \int_0^1, \frac{a}{b}, x^2, etc.

    // First, try to find and render parenthesized LaTeX expressions: ( \expr ... )
    let result = text.replace(/\(\s*((?:[^()]*\\[a-zA-Z]+[^()]*)+)\s*\)/g, (match, expr) => {
        try {
            const rendered = katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false })
            return rendered
        } catch {
            return match
        }
    })

    // If the entire text looks like a math expression, render the whole thing
    if (result === text && containsRawLatex(text)) {
        // Find contiguous LaTeX segments (command + arguments + operators + numbers + variables)
        result = text.replace(
            /((?:\\[a-zA-Z]+(?:_\{[^}]*\}|_[a-zA-Z0-9]|\^\{[^}]*\}|\^[a-zA-Z0-9]|\{[^}]*\}|\([^)]*\))*(?:\s*[+\-=<>*/^_,]\s*(?:[a-zA-Z0-9]+(?:_\{[^}]*\}|_[a-zA-Z0-9]|\^\{[^}]*\}|\^[a-zA-Z0-9])*|\\[a-zA-Z]+(?:\{[^}]*\})*))*)+)/g,
            (match) => {
                try {
                    return katex.renderToString(match.trim(), { displayMode: false, throwOnError: false })
                } catch {
                    return match
                }
            }
        )
    }

    return result
}

interface SmartTextProps {
    text: string
    className?: string
    as?: 'p' | 'span' | 'div'
}

export default function SmartText({ text, className = '', as: Tag = 'p' }: SmartTextProps) {
    const isArabic = useMemo(() => containsArabic(text), [text])
    const hasExplicitLatex = useMemo(() => /\$\$.+?\$\$|\$.+?\$/.test(text), [text])
    const hasRawLatex = useMemo(() => containsRawLatex(text), [text])
    const hasLatex = hasExplicitLatex || hasRawLatex

    const arabicClasses = isArabic ? 'arabic-text' : ''
    const combinedClassName = `${className} ${arabicClasses}`.trim()

    if (hasLatex) {
        let html: string
        if (hasExplicitLatex) {
            html = renderLatexInText(text)
        } else {
            html = renderRawLatexInText(text)
        }

        // Process Markdown formatting (bold, italic)
        // Note: we do this AFTER LaTeX processing so we don't break LaTeX commands
        // However, we must be careful not to break LaTeX that might contain * or _
        // So we only replace if it's clearly not inside a LaTeX block

        // First, convert literal \n to <br> and real newlines to <br>
        html = html.replace(/\\n/g, '<br />').replace(/\n/g, '<br />')

        // Basic Markdown Bold: **text** -> <b>text</b>
        html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')

        // Basic Markdown Italic: *text* -> <i>text</i> (careful with LaTeX multiplication)
        // We only match if it's not surrounded by numbers/whitespace typical in math
        html = html.replace(/(^|[^\w\d\\])\*(?!\s)(.*?)(?<!\s)\*(?!\w)/g, '$1<i>$2</i>')

        return (
            <Tag
                className={combinedClassName}
                dangerouslySetInnerHTML={{ __html: html }}
                dir="auto"
            />
        )
    }

    // Replace literal \n with real newlines for whitespace-pre-wrap to work
    const cleanedText = text.replace(/\\n/g, '\n')

    return (
        <Tag
            className={`${combinedClassName} whitespace-pre-wrap`}
            dir="auto"
        >
            {cleanedText}
        </Tag>
    )
}

