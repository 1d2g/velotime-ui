import React from 'react';

const LegalPages = ({ path }) => {
  let title = '';
  let content = '';

  switch (path) {
    case '/privacy':
      title = 'Privacy Policy';
      content = 'This is a placeholder for the Privacy Policy. You can update this content with your generated policy.';
      break;
    case '/contact':
      title = 'Contact Us';
      content = 'If you have any questions, please contact us at support@velotime.dg.tools.';
      break;
    case '/cookies':
      title = 'Cookie Policy';
      content = 'This is a placeholder for the Cookie Policy. VeloTime uses strictly necessary cookies for authentication.';
      break;
    case '/tos':
      title = 'Terms of Service';
      content = 'This is a placeholder for the Terms of Service. You can update this content with your generated terms.';
      break;
    case '/data-removal':
      title = 'Data Removal Request';
      content = 'To request the removal of your personal data, please contact us at support@velotime.dg.tools with the subject "Data Removal Request".';
      break;
    default:
      title = 'Page Not Found';
      content = 'The page you are looking for does not exist.';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-8">
        <div className="mb-8 flex justify-between items-center border-b pb-4">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
          <a href="/" className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors">
            &larr; Back to VeloTime
          </a>
        </div>
        <div className="prose prose-blue max-w-none text-gray-700">
          <p className="text-lg leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
