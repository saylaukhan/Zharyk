import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Lock, ChevronRight, Loader2, Sparkles, Wind } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function CoursePass() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Progress state
  const [completedModules, setCompletedModules] = useState(0);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  
  // Practice state
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [essayAnswer, setEssayAnswer] = useState('');
  
  useEffect(() => {
    async function loadCourse() {
      try {
        const res = await fetch(`${API}/courses/${id}`);
        if (!res.ok) throw new Error('Failed to load course');
        const data = await res.json();
        setCourse(data);
        const sortedModules = (data.modules || []).sort((a, b) => a.position - b.position);
        setModules(sortedModules);
        
        // Fetch progress if possible
        if (user && user.id) {
          const progRes = await fetch(`${API}/courses/progress/${user.id}`);
          if (progRes.ok) {
            const progData = await progRes.json();
            const courseProg = progData.find(p => p.course_id === Number(id));
            if (courseProg) {
              setCompletedModules(courseProg.modules_completed || 0);
              setCurrentModuleIndex(Math.min(courseProg.modules_completed || 0, sortedModules.length - 1));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [id, user]);

  const saveProgress = async (newCompletedCount) => {
    if (!user || !user.id || !course) return;
    try {
      await fetch(`${API}/courses/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          course_id: course.id,
          modules_completed: newCompletedCount,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextLesson = () => {
    // Check if we need to unlock the next lesson
    let newCompleted = completedModules;
    if (currentModuleIndex === completedModules) {
      newCompleted = completedModules + 1;
      setCompletedModules(newCompleted);
      saveProgress(newCompleted);
    }
    
    // Reset interaction states
    setSelectedOption(null);
    setIsAnswered(false);
    setEssayAnswer('');
    
    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      // Course finished! Add fireworks or navigate away
      alert(t('coursePass.congratulations'));
      navigate('/app');
    }
  };

  const currentModule = modules[currentModuleIndex];
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-[#18181B]">
        <Loader2 className="animate-spin text-zharyq-orange" size={32} />
      </div>
    );
  }

  if (!course || !currentModule) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-[#18181B]">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">{t('coursePass.courseNotFound')}</h2>
        <button onClick={() => navigate('/app')} className="text-zharyq-orange">{t('coursePass.goBack')}</button>
      </div>
    );
  }

  const progressPercent = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;
  
  // Helpers for Theory
  const theory = currentModule.theory;
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return null; /* Fallback to standard video element config could be done here */
  };
  const embedUrl = theory?.video_url ? getEmbedUrl(theory.video_url) : null;

  // Helpers for Practice
  const practice = currentModule.practice;
  let quizOptions = [];
  try {
    if (practice?.quiz_options) {
      quizOptions = JSON.parse(practice.quiz_options);
    }
  } catch (e) { console.error(e) }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-[#18181B] font-sans">
      
      {/* Левый сайдбар (Навигация Сириус) */}
      <aside className="w-[280px] md:w-[320px] shrink-0 h-full flex flex-col bg-[#F9FAFB] dark:bg-[#27272A] border-r border-zinc-200 dark:border-zinc-700">
        
        {/* Шапка сайдбара */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/app')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors text-zinc-500 dark:text-zinc-400"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
          
          <h2 className="font-semibold text-[14px] text-zinc-900 dark:text-white mb-3 line-clamp-2">
            {course.title}
          </h2>
          
          {/* Прогресс-бар */}
          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 dark:bg-[#2DD4BF] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t('coursePass.progress', { percent: progressPercent })}
          </div>
        </div>

        {/* Список уроков */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {modules.map((m, index) => {
            const isCompleted = index < completedModules;
            const isActive = index === currentModuleIndex;
            const isLocked = index > completedModules; // Strict sequential access

            return (
              <button
                key={m.id}
                disabled={isLocked}
                onClick={() => {
                  setCurrentModuleIndex(index);
                  setSelectedOption(null);
                  setIsAnswered(false);
                }}
                className={`w-full text-left py-2 px-3 rounded-lg flex items-center transition-colors duration-150 ease-out group ${
                  isActive 
                    ? 'bg-teal-50 dark:bg-teal-900/30' 
                    : isCompleted
                      ? 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
                      : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="mr-3 shrink-0 flex items-center justify-center w-5 h-5">
                  {isCompleted && !isActive && <Check size={16} className="text-teal-500 dark:text-[#2DD4BF]" />}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-[#2DD4BF]" />}
                  {isLocked && <Lock size={14} className="text-zinc-400" strokeWidth={1.5} />}
                </div>
                <span className={`text-[13px] leading-tight ${
                  isActive 
                    ? 'text-zinc-900 dark:text-white font-medium' 
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Правая колонка: Зона теории и тестирования */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-[#18181B] relative">
        <div className="max-w-[700px] mx-auto py-12 px-6 md:px-8 pb-32 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {currentModule.module_type === 'theory' && theory && (
            <>
              {embedUrl && (
                <div className="w-full aspect-video bg-[#18181B] rounded-2xl mb-8 flex items-center justify-center border border-zinc-800 overflow-hidden shadow-sm">
                  <iframe 
                    src={embedUrl} 
                    className="w-full h-full" 
                    allowFullScreen 
                    title="Course Video"
                  />
                </div>
              )}

              <article className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-[1.7] prose-p:text-[14px]">
                <h1 className="text-[24px] font-semibold text-[#1F2937] dark:text-[#F4F4F5] mb-6 tracking-tight">
                  {theory.lesson_title || currentModule.label}
                </h1>
                
                <div 
                  className="lesson-content-html" 
                  dangerouslySetInnerHTML={{ __html: theory.article_content || '<p>Контент скоро появится...</p>' }}
                  style={{ color: 'var(--color-text-primary)' }}
                ></div>
              </article>

              <div className="mt-12 flex justify-end items-center">
                <button
                  onClick={handleNextLesson}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 transition-colors duration-150 flex items-center gap-2"
                >
                  {t('coursePass.lessonComplete')}
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {currentModule.module_type === 'practice' && practice && (
            <div className="mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8">
              
              {practice.practice_type === 'quiz' && (
                <>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-5">
                    {t('coursePass.knowledgeCheck')}
                  </h3>
                  <p className="text-[14px] text-zinc-800 dark:text-zinc-300 mb-6">
                    {practice.quiz_question || currentModule.label}
                  </p>

                  <div className="space-y-3">
                    {quizOptions.map((optionText, idx) => {
                      if (!optionText) return null;
                      const isSelected = selectedOption === idx;
                      const showCorrect = isAnswered && idx === practice.quiz_correct_index;
                      const showWrong = isAnswered && isSelected && idx !== practice.quiz_correct_index;
                      
                      let cardClasses = "w-full text-left p-4 rounded-xl border transition-colors duration-150 ease-out flex items-center outline-none ";
                      let dotClasses = "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mr-4 transition-colors duration-150 ease-out ";
                      
                      if (showCorrect) {
                        cardClasses += "border-teal-500 bg-teal-50 dark:bg-teal-900/20";
                        dotClasses += "border-teal-500 bg-teal-500";
                      } else if (showWrong) {
                        cardClasses += "border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10";
                        dotClasses += "border-red-500 bg-red-500";
                      } else if (isSelected) {
                        cardClasses += "border-[#FF7100] dark:border-[#FF851B] bg-[#FF7100]/10 dark:bg-[#FF851B]/10";
                        dotClasses += "border-[#FF7100] dark:border-[#FF851B]";
                      } else if (!isAnswered) {
                        cardClasses += "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600";
                        dotClasses += "border-zinc-300 dark:border-zinc-600";
                      } else {
                        cardClasses += "border-zinc-200 dark:border-zinc-800 opacity-50";
                        dotClasses += "border-zinc-300 dark:border-zinc-700";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (!isAnswered) setSelectedOption(idx);
                          }}
                          className={cardClasses}
                          disabled={isAnswered}
                        >
                          <div className={dotClasses}>
                            {(showCorrect || showWrong) && <Check size={10} className="text-white" />}
                            {(isSelected && !isAnswered) && <div className="w-2 h-2 rounded-full bg-[#FF7100] dark:bg-[#FF851B]" />}
                          </div>
                          <span className="text-[14px] text-zinc-900 dark:text-zinc-200">
                            {optionText}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    {!isAnswered ? (
                      <button
                        onClick={() => {
                          if (selectedOption !== null) setIsAnswered(true);
                        }}
                        disabled={selectedOption === null}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                          selectedOption !== null 
                            ? "bg-[#FF7100] text-white hover:bg-[#E66600]" 
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        }`}
                      >
                        {t('coursePass.answer')}
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedOption === practice.quiz_correct_index ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-[#2DD4BF] text-sm font-medium">
                              <Check size={16} />
                              {t('coursePass.correct')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
                              {t('coursePass.incorrect')}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleNextLesson}
                          className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#FF7100] dark:text-[#FF851B] bg-[#FF7100]/10 dark:bg-[#FF851B]/10 hover:bg-[#FF7100]/20 dark:hover:bg-[#FF851B]/20 transition-colors duration-150 flex items-center gap-2"
                        >
                          {t('coursePass.next')}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {practice.practice_type === 'essay' && (
                <>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                    {t('coursePass.openQuestion')}
                    {practice.ai_enabled && <Sparkles size={16} className="text-[#FF7100]" />}
                  </h3>
                  <p className="text-[14px] text-zinc-800 dark:text-zinc-300 mb-6">
                    {practice.prompt || t('coursePass.defaultPrompt')}
                  </p>

                  <textarea
                    value={essayAnswer}
                    onChange={e => setEssayAnswer(e.target.value)}
                    disabled={isAnswered}
                    placeholder={t('coursePass.essayPlaceholder')}
                    rows={6}
                    className="w-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 text-sm focus:border-[#FF7100] dark:focus:border-[#FF851B] transition-colors outline-none resize-none disabled:opacity-50"
                  />
                  
                  <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    {!isAnswered ? (
                      <button
                        onClick={() => {
                          if (essayAnswer.trim().length > 0) setIsAnswered(true);
                        }}
                        disabled={essayAnswer.trim().length === 0}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                          essayAnswer.trim().length > 0
                            ? "bg-[#FF7100] text-white hover:bg-[#E66600]" 
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        }`}
                      >
                        {t('coursePass.completeTask')}
                      </button>
                    ) : (
                      <button
                        onClick={handleNextLesson}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-[#FF7100] dark:text-[#FF851B] bg-[#FF7100]/10 dark:bg-[#FF851B]/10 hover:bg-[#FF7100]/20 dark:hover:bg-[#FF851B]/20 transition-colors duration-150 flex items-center gap-2"
                      >
                        {t('coursePass.next')}
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </>
              )}

              {practice.practice_type === 'breathing' && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 rounded-full border-2 border-teal-500 flex items-center justify-center mb-6 bg-teal-50 dark:bg-teal-900/10">
                    <Wind size={36} className="text-teal-500" />
                  </div>
                  <h3 className="text-xl font-medium text-zinc-900 dark:text-white mb-2">
                    {t('coursePass.breathingPractice')}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 max-w-sm mx-auto">
                    {t('coursePass.breathingDesc', { minutes: practice.breath_duration_minutes || 5 })}
                  </p>

                  <button
                    onClick={handleNextLesson}
                    className="px-8 py-3 rounded-xl text-sm font-medium text-white bg-[#FF7100] hover:bg-[#E66600] transition-colors duration-150"
                  >
                    {t('coursePass.completePractice')}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
      
      <style>{`
        .lesson-content-html blockquote {
          border-left: 3px solid #FF7100;
          padding-left: 1rem;
          font-style: italic;
          color: #6B7280;
          margin: 1.5rem 0;
        }
        .dark .lesson-content-html blockquote {
          color: #A1A1AA;
        }
        .lesson-content-html ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .lesson-content-html li {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}
