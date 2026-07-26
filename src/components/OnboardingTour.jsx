import React, { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';

export default function OnboardingTour({ hasCompletedOnboarding, projects, onComplete }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run if they haven't completed it, AND they have at least one project so the matrix is visible
    if (!hasCompletedOnboarding && projects.length > 0) {
      // Small timeout to allow the matrix DOM elements to render fully
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, projects]);

  const steps = [
    {
      target: '.tour-project-header',
      content: 'Welcome to VeloTime. Here is your first project. Let\'s break it down into tasks.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-add-task',
      content: 'You track time against specific tasks. Click here to add one.',
      placement: 'bottom',
    },
    {
      target: '.tour-time-cell',
      content: 'Click any cell to log your hours. You can also use your keyboard arrow keys to navigate the grid like Excel!',
      placement: 'bottom',
    },
    {
      target: '.tour-save-indicator',
      content: 'No need to hit save. Every keystroke is instantly synced to the cloud.',
      placement: 'left',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (onComplete) onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          zIndex: 10000,
        }
      }}
    />
  );
}
