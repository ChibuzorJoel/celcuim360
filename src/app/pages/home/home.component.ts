
import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

declare var $: any; // for Owl Carousel

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChildren('counterValue') counterValues!: QueryList<ElementRef>;

  private routerSub!: Subscription;
  private carouselInitialized = false;

isNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value);
}

 counterData = [
  {
    target: 100,
    label: 'Purpose-Driven Commitment',
    suffix: '%',
    bgColor: 'bg-primary',
    numColor: 'text-dark',
    textColor: 'text-white',
  },
  {
    label: 'Cross Industry Expertise', // purely text
    bgColor: 'bg-dark',
    numColor: 'text-white',
    textColor: 'text-white',
     fontsize: 'fs-3',
  },
  {
    target: 3.5,
    label: 'Million Lives and businesses to be impacted',
    suffix: '+',
    bgColor: 'bg-primary',
    numColor: 'text-dark',
    textColor: 'text-white',
  },
];


  constructor(private router: Router) {}

  ngOnInit(): void {
    // Reinitialize carousel and restart video on navigation back to home
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event.urlAfterRedirects === '/' || event.url === '/home') {
          setTimeout(() => {
            this.initCarousel();
            this.restartVideo();
            this.startCounterAnimation();
          }, 300);
        }
      });
  }

  ngAfterViewInit(): void {
    this.initCarousel();
    this.restartVideo();
    this.startCounterAnimation();
  }

  ngOnDestroy(): void {
    if (this.routerSub) this.routerSub.unsubscribe();
  }

  /** --- Video Autoplay --- */
  private restartVideo(): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      video.currentTime = 0;
      video.muted = true;
      video.play().catch((err) => console.warn('Video autoplay blocked:', err));
    }
  }

  /** --- Owl Carousel --- */
  private initCarousel(): void {
    if (this.carouselInitialized) {
      $('.header-carousel').trigger('destroy.owl.carousel');
      $('.header-carousel').removeClass('owl-loaded');
      $('.header-carousel').find('.owl-stage-outer').children().unwrap();
    }

    $('.header-carousel').owlCarousel({
      autoplay: true,
      smartSpeed: 1000,
      items: 1,
      dots: true,
      loop: true,
      nav: true,
      navText: [
        '<i class="bi bi-chevron-left"></i>',
        '<i class="bi bi-chevron-right"></i>',
      ],
    });

    this.carouselInitialized = true;
  }

  /** --- Counter Animation --- */
 private startCounterAnimation(): void {
  if (this.counterValues.length) {
    this.counterValues.forEach((counter, index) => {
      const item = this.counterData[index];
      if (item && typeof item.target === 'number') {
        const suffix = item.suffix || '';
        this.animateCount(counter.nativeElement, item.target, 2000, suffix);
      } else if (item && item.label) {
        counter.nativeElement.textContent = item.label;
      }
    });
  }
}

 private animateCount(element: HTMLElement, target: number, duration: number, suffix: string = ''): void {
  let current = 0;
  const intervalTime = 10;
  const increment = target / (duration / intervalTime);

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      clearInterval(timer);
      current = target;
    }

    // Keep suffix visible during animation
    element.textContent = Math.ceil(current).toString() + suffix;
  }, intervalTime);
}
}
