import { Component, HostListener } from '@angular/core';
@Component({
  selector: 'app-training',
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent {
  title = 'celcuim-training';
  isMobileMenuOpen = false;

  ngOnInit() {
    this.setupScrollAnimations();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.handleHeaderScroll();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    const nav = document.querySelector('nav ul') as HTMLElement;
    if (nav) {
      nav.style.display = this.isMobileMenuOpen ? 'flex' : 'none';
    }
  }

  private setupScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const fadeInObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    
    fadeElements.forEach(element => {
      fadeInObserver.observe(element);
    });
  }

  private handleHeaderScroll() {
    const header = document.querySelector('header');
    if (header && window.scrollY > 100) {
      header.classList.add('scrolled');
    } else if (header) {
      header.classList.remove('scrolled');
    }
  }
}