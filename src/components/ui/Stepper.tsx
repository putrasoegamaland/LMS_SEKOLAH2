'use client'

import React from 'react'
import { Check } from 'lucide-react'

interface Step {
    label: string
    icon?: React.ReactNode
}

interface StepperProps {
    steps: Step[]
    currentStep: number
    className?: string
}

export function Stepper({ steps, currentStep, className = '' }: StepperProps) {
    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            {steps.map((step, index) => {
                const isCompleted = index < currentStep
                const isCurrent = index === currentStep
                const isUpcoming = index > currentStep

                return (
                    <React.Fragment key={index}>
                        {/* Step Circle */}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center
                                    transition-all duration-300 font-bold text-sm
                                    ${isCompleted
                                        ? 'bg-green-500 text-white'
                                        : isCurrent
                                            ? 'bg-primary text-white ring-4 ring-primary/20'
                                            : 'bg-secondary/20 text-text-secondary dark:bg-white/10 dark:text-zinc-500'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <Check className="w-5 h-5" />
                                ) : step.icon ? (
                                    step.icon
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span
                                className={`
                                    text-xs font-medium text-center max-w-[80px]
                                    ${isCurrent
                                        ? 'text-primary dark:text-primary'
                                        : isCompleted
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-text-secondary dark:text-zinc-500'
                                    }
                                `}
                            >
                                {step.label}
                            </span>
                        </div>

                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <div
                                className={`
                                    h-0.5 w-12 rounded-full transition-all duration-300 -mt-6
                                    ${index < currentStep
                                        ? 'bg-green-500'
                                        : 'bg-secondary/20 dark:bg-white/10'
                                    }
                                `}
                            />
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}

export default Stepper
