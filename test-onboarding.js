async function test() {
  try {
    const res = await fetch('https://time-production-b6d9.up.railway.app/api/user/complete-onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
test();
