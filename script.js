
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    const scrollOptions = {
      top: target.offsetTop,
      behavior: 'smooth'
    };
    window.scrollTo(scrollOptions);
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

document.getElementById("menu-btn")?.addEventListener("click", () => {
  const menu = document.getElementById("mobile-menu");
  menu.classList.toggle("hidden");
});

document.querySelectorAll("#mobile-menu a").forEach(link => {
  link.addEventListener("click", () => {
    const menu = document.getElementById("mobile-menu");
    menu.classList.add("hidden");
  });
});

window.addEventListener('load', () => {
  const fadeSections = document.querySelectorAll('.fade-section');
  fadeSections.forEach((section) => {
    section.classList.add('fade-in-visible');
  });
});