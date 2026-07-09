import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import en from './locales/en.json'

const saved = localStorage.getItem('wiselearn_lang')
const defaultLng = saved === 'en' || saved === 'zh' ? saved : 'en'

i18n.use(initReactI18next).init({
  resources: { zh: { translation: zh }, en: { translation: en } },
  lng: defaultLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
