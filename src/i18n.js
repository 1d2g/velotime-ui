import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      submitForApproval: "Submit for Approval",
      addProject: "Add Project",
      weeklyProgress: "Weekly Progress",
      capacityGoal: "Capacity Goal",
      timeAllocation: "Time Allocation",
      overtimeAlert: "OVERTIME ALERT",
      saveChanges: "Save Changes",
      cancel: "Cancel",
      language: "Language",
      english: "English",
      spanish: "Español",
      auditStatus: "Audit Status"
    }
  },
  es: {
    translation: {
      submitForApproval: "Enviar para Aprobación",
      addProject: "Añadir Proyecto",
      weeklyProgress: "Progreso Semanal",
      capacityGoal: "Meta de Capacidad",
      timeAllocation: "Asignación de Tiempo",
      overtimeAlert: "ALERTA DE HORAS EXTRAS",
      saveChanges: "Guardar Cambios",
      cancel: "Cancelar",
      language: "Idioma",
      english: "Inglés",
      spanish: "Español",
      auditStatus: "Estado de Auditoría"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
