export const getTestLevelInfo = (slug, level) => {
  let label = level === 'low' ? 'Низкий' : level === 'medium' ? 'Средний' : level === 'high' ? 'Высокий' : 'Критический';
  let style = level === 'low' ? 'text-red-600 bg-red-50 border-red-100' : 
              level === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-100' : 
              level === 'high' ? 'text-green-700 bg-green-50 border-green-100' : 
              'text-red-800 bg-red-100 border-red-300';

  if (slug === 'beck-hopelessness') {
    if (level === 'low') style = 'text-green-700 bg-green-50 border-green-100';
    else if (level === 'medium' || level === 'high') style = 'text-amber-600 bg-amber-50 border-amber-100';
    else style = 'text-red-600 bg-red-50 border-red-100';
  } else if (['russell-loneliness', 'young-internet'].includes(slug)) {
    if (level === 'low') style = 'text-green-700 bg-green-50 border-green-100';
    else if (level === 'medium') style = 'text-amber-600 bg-amber-50 border-amber-100';
    else if (level === 'high') style = 'text-red-600 bg-red-50 border-red-100';
    else style = 'text-red-800 bg-red-100 border-red-300';
  }

  if (slug === 'beck-hopelessness') {
    if (level === 'low') label = 'Норма';
    else if (level === 'medium') label = 'Легкая';
    else if (level === 'high') label = 'Умеренная';
    else if (level === 'critical') label = 'Тяжелая';
  } else if (slug === 'young-internet') {
    if (level === 'low') label = 'Обычный юзер';
    else if (level === 'medium') label = 'Проблемы';
    else if (level === 'high') label = 'Зависимость';
  } else if (slug === 'rosenberg') {
    if (level === 'low') label = 'Низкая';
    else if (level === 'medium') label = 'Средняя';
    else if (level === 'high') label = 'Высокая';
  }
  
  return { label, style };
};
