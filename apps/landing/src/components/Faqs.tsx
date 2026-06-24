import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const faqs = [
  {
    question: "¿Puedo probar onClick antes de pagar?",
    answer: "Sí, tenés 14 días de prueba gratuita con acceso completo a todas las funcionalidades. No requiere tarjeta de crédito."
  },
  {
    question: "¿Cómo invito profesionales a mi negocio?",
    answer: "Desde el módulo Profesionales generás un link único. El profesional se registra y automáticamente queda conectado a la agenda de tu negocio."
  },
  {
    question: "¿Mis clientes pueden sacar turnos solos?",
    answer: "Sí. Compartís tu URL pública (ej. onclick.com/tuegocio) y tus clientes eligen servicio, profesional, fecha y hora sin que vos tengas que intervenir. Reciben recordatorios por WhatsApp."
  },
  {
    question: "¿Puedo cambiar de plan en cualquier momento?",
    answer: "Podés mejorar de plan (upgrade) en cualquier momento y se aplica al instante. Para bajar de plan, el cambio se hará efectivo en tu próximo ciclo de facturación."
  }
];

export function Faqs() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="w-full space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div 
            key={index} 
            className="border border-gray-200 bg-white rounded-xl overflow-hidden transition-all duration-200 shadow-sm"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
            >
              <span className="font-semibold text-lg text-[#0f1729]">{faq.question}</span>
              <ChevronDown 
                className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isOpen && "transform rotate-180")} 
              />
            </button>
            
            <div 
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="p-6 pt-0 text-gray-600 leading-relaxed">
                {faq.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
