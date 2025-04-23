// Example of smooth scroll for anchors (if you have in-page links)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });

  

  // Page load fade-in effect
window.addEventListener('load', () => {
  const fadeSections = document.querySelectorAll('.fade-section');
  fadeSections.forEach((section) => {
    section.classList.add('fade-in-visible');
  });
});

// Scroll-based fade-in/out effect
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in-visible');
    } else {
      entry.target.classList.remove('fade-in-visible');
    }
  });
}, {
  threshold: 0.5 // Trigger when 50% of the section is visible
});

document.querySelectorAll('.fade-section').forEach(section => {
  observer.observe(section);
});

