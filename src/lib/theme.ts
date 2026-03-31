export const THEMES = [
  {
    id: 'theme-frame-pro',
    name: 'Frame Pro',
    primary: '#FF8C00',
    secondary: '#FFFFFF',
    vars: {
      '--brand-50': '33 100% 96%',
      '--brand-100': '34 100% 92%',
      '--brand-200': '32 98% 83%',
      '--brand-300': '28 96% 73%',
      '--brand-400': '27 96% 61%',
      '--brand-500': '25 95% 53%',
      '--brand-600': '20 94% 46%',
      '--primary': '25 95% 53%',
    }
  },
  {
    id: 'theme-elegancia-dourada',
    name: 'Elegância Dourada',
    primary: '#D4AF37',
    secondary: '#1a1a1a',
    vars: {
      '--brand-50': '46 65% 95%',
      '--brand-100': '46 65% 90%',
      '--brand-200': '46 65% 80%',
      '--brand-300': '46 65% 70%',
      '--brand-400': '46 65% 60%',
      '--brand-500': '46 65% 52%',
      '--brand-600': '46 65% 42%',
      '--primary': '46 65% 52%',
    }
  },
  {
    id: 'theme-azul-profissional',
    name: 'Azul Profissional',
    primary: '#2E5090',
    secondary: '#F5F5F5',
    vars: {
      '--brand-50': '219 51% 95%',
      '--brand-100': '219 51% 90%',
      '--brand-200': '219 51% 80%',
      '--brand-300': '219 51% 70%',
      '--brand-400': '219 51% 47%',
      '--brand-500': '219 51% 37%',
      '--brand-600': '219 51% 27%',
      '--primary': '219 51% 37%',
    }
  },
  {
    id: 'theme-rosa-sofisticado',
    name: 'Rosa Sofisticado',
    primary: '#D4547C',
    secondary: '#FFF8F9',
    vars: {
      '--brand-50': '341 61% 95%',
      '--brand-100': '341 61% 90%',
      '--brand-200': '341 61% 80%',
      '--brand-300': '341 61% 68%',
      '--brand-400': '341 61% 58%',
      '--brand-500': '341 61% 48%',
      '--brand-600': '341 61% 38%',
      '--primary': '341 61% 48%',
    }
  },
  {
    id: 'theme-verde-natural',
    name: 'Verde Natural',
    primary: '#2D6A4F',
    secondary: '#F1FAEE',
    vars: {
      '--brand-50': '153 40% 95%',
      '--brand-100': '153 40% 90%',
      '--brand-200': '153 40% 80%',
      '--brand-300': '153 40% 60%',
      '--brand-400': '153 40% 40%',
      '--brand-500': '153 40% 30%',
      '--brand-600': '153 40% 20%',
      '--primary': '153 40% 30%',
    }
  },
  {
    id: 'theme-cinza-minimalista',
    name: 'Cinza Minimalista',
    primary: '#4A4A4A',
    secondary: '#FFFFFF',
    vars: {
      '--brand-50': '0 0% 95%',
      '--brand-100': '0 0% 90%',
      '--brand-200': '0 0% 80%',
      '--brand-300': '0 0% 70%',
      '--brand-400': '0 0% 50%',
      '--brand-500': '0 0% 29%',
      '--brand-600': '0 0% 20%',
      '--primary': '0 0% 29%',
    }
  },
];

export const applyTheme = (themeId: string) => {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  
  // Aplica as variáveis CSS dinamicamente na tag <html>
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Salva no navegador do usuário
  localStorage.setItem('framepro_theme', themeId);
};

export const getActiveTheme = () => {
  return localStorage.getItem('framepro_theme') || 'theme-frame-pro';
};