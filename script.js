
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });

  


window.addEventListener('load', () => {
  const fadeSections = document.querySelectorAll('.fade-section');
  fadeSections.forEach((section) => {
    section.classList.add('fade-in-visible');
  });
});


const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in-visible');
    } else {
      entry.target.classList.remove('fade-in-visible');
    }
  });
}, {
  threshold: 0.5
});

document.querySelectorAll('.fade-section').forEach(section => {
  observer.observe(section);
});

