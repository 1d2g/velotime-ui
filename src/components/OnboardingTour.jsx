import React, { useState, useEffect } from "react";
import { Joyride, STATUS } from "react-joyride";

export default function OnboardingTour({
  hasCompletedOnboarding,
  projects,
  onComplete,
}) {
  // Feature paused until database completion state persistence is reviewed
  return null;

  const steps = [
    {
      target: ".tour-project-header",
      content:
        "Welcome to VeloTime. Here is your first project. Let's break it down into tasks.",
      disableBeacon: true,
      placement: "bottom",
    },
    {
      target: ".tour-add-task",
      content: "You track time against specific tasks. Click here to add one.",
      placement: "bottom",
    },
    {
      target: ".tour-time-cell",
      content:
        "Click any cell to log your hours. You can also use your keyboard arrow keys to navigate the grid like Excel!",
      placement: "bottom",
    },
    {
      target: ".tour-save-indicator",
      content:
        "No need to hit save. Every keystroke is instantly synced to the cloud.",
      placement: "left",
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { status, type, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) || type === "tour:end" || action === "close") {
      setRun(false);
      if (onComplete) onComplete();
    }
  };

  if (hasCompletedOnboarding) {
    return null;
  }

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
          primaryColor: "#2563eb",
          zIndex: 10000,
        },
      }}
    />
  );
}
