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

export const getTestInterpretation = (slug, level) => {
  if (slug === 'hardiness-maddi' || !slug) {
    if (level === 'high') return 'У вас высокий уровень жизнестойкости. Вы хорошо справляетесь со стрессом, уверены в себе и открыты к новому опыту. Продолжайте поддерживать свое психологическое здоровье!';
    if (level === 'medium') return 'У вас средний уровень жизнестойкости. Вы в целом неплохо справляетесь со стрессом, но некоторые области можно укрепить. Рекомендуем пройти курсы по управлению стрессом и развитию контроля.';
    return 'Ваш уровень жизнестойкости ниже среднего. Это означает, что стрессовые ситуации могут быть для вас сложными. Рекомендуем обратиться к психологу и пройти курсы по управлению стрессом и развитию эмоциональной устойчивости.';
  } else if (slug === 'rosenberg') {
    if (level === 'high') return 'У вас высокое самоуважение. Вы цените себя и свои качества. Продолжайте поддерживать позитивное отношение к себе.';
    if (level === 'medium') return 'У вас средний уровень самоуважения. Вы в целом принимаете себя, но иногда можете сомневаться в своих силах.';
    return 'У вас низкий уровень самоуважения. Рекомендуем обратить внимание на свои сильные стороны, поверить в себя и, возможно, обсудить это с психологом.';
  } else if (slug === 'beck-hopelessness') {
    if (level === 'low') return 'Безнадежность не выявлена. Вы смотрите в будущее с оптимизмом и надеждой.';
    if (level === 'medium' || level === 'high') return 'У вас присутствует легкая или умеренная безнадежность. Возможно, вы переживаете трудный период. Обратитесь за поддержкой.';
    return 'У вас выявлена тяжелая безнадежность. Настоятельно рекомендуем обратиться за профессиональной психологической поддержкой.';
  } else if (slug === 'russell-loneliness') {
    if (level === 'low') return 'У вас низкий уровень одиночества. Вы чувствуете себя комфортно в окружении людей.';
    if (level === 'medium') return 'У вас средний уровень одиночества. Иногда вам может не хватать общения и социальной поддержки.';
    return 'У вас высокая степень одиночества. Вы часто чувствуете себя изолированным от других. Рекомендуем больше общаться и найти новые увлечения.';
  } else if (slug === 'young-internet') {
    if (level === 'low') return 'Вы обычный пользователь интернета. Вы контролируете время, проведенное в сети.';
    if (level === 'medium') return 'У вас присутствуют некоторые проблемы, связанные с чрезмерным использованием интернета. Постарайтесь больше времени уделять реальной жизни.';
    return 'У вас выраженная интернет-зависимость. Рекомендуем сократить время пребывания онлайн и чаще бывать офлайн.';
  }
  return 'Тест завершен. Результаты сохранены.';
};
