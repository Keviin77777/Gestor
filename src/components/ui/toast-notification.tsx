"use client";

import React from "react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

interface ToastNotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

export function showToast({ type, message, duration = 3000 }: ToastNotificationProps) {
  // Remover notificações existentes
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => toast.remove());

  // Criar nova notificação
  const toast = document.createElement('div');
  toast.className = 'toast-notification fixed top-4 right-4 z-50 max-w-md w-full transform transition-all duration-300 ease-in-out';
  
  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  }[type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800'
  }[type];

  const iconColor = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600'
  }[type];

  const IconComponent = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  }[type];

  toast.innerHTML = `
    <div class="flex items-start gap-3 p-4 ${bgColor} border rounded-lg shadow-lg">
      <div class="flex-shrink-0">
        <span class="text-lg">${IconComponent}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium ${textColor}">${message}</p>
      </div>
      <button class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  // Adicionar ao DOM
  document.body.appendChild(toast);

  // Animação de entrada
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 10);

  // Remover automaticamente
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// Funções de conveniência
export const showSuccessToast = (message: string, duration?: number) => 
  showToast({ type: 'success', message, duration });

export const showErrorToast = (message: string, duration?: number) => 
  showToast({ type: 'error', message, duration });

export const showInfoToast = (message: string, duration?: number) => 
  showToast({ type: 'info', message, duration });