import React from "react";
import { privacyPolicyHtml } from "../content/privacy.js";
import { tosHtml } from "../content/tos.js";
import { cookiesHtml } from "../content/cookies.js";

const LegalPages = ({ path }) => {
  let title = "";
  let content = "";
  let isHtml = false;

  switch (path) {
    case "/privacy":
      title = "Privacy Policy";
      content = privacyPolicyHtml;
      isHtml = true;
      break;
    case "/contact":
      title = "Contact Us";
      content =
        "If you have any questions, please contact us at support@velotime.dg.tools.";
      break;
    case "/cookies":
      title = "Cookie Policy";
      content = cookiesHtml;
      isHtml = true;
      break;
    case "/tos":
      title = "Terms of Service";
      content = tosHtml;
      isHtml = true;
      break;
    case "/data-removal":
      title = "Data Removal Request";
      content =
        'To request the removal of your personal data, please contact us at support@velotime.dg.tools with the subject "Data Removal Request".';
      break;
    default:
      title = "Page Not Found";
      content = "The page you are looking for does not exist.";
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white dark:bg-zinc-900 shadow p-8">
        <div className="mb-8 flex justify-between items-center border-b pb-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h1>
          <a
            href="/"
            className="text-primary-600 hover:text-blue-800 font-semibold text-sm transition-colors"
          >
            &larr; Back to VeloTime
          </a>
        </div>
        <div className="prose prose-blue max-w-none text-slate-700 dark:text-slate-300">
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p className="text-lg leading-relaxed">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
