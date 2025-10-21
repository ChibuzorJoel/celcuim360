import { Component, OnInit, AfterViewInit, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChildren('counterValue') counterValues!: QueryList<ElementRef>;
    @ViewChild('aboutVideo') aboutVideo!: ElementRef<HTMLVideoElement>;

   playVideo() {
    const video = this.aboutVideo.nativeElement;
    video.play();
  }

  pauseVideo() {
    const video = this.aboutVideo.nativeElement;
    video.pause();
  }

  counterData = [
    { target: 32, label: 'Project Complete', suffix: 'k+', bgColor: 'bg-primary', numColor: 'text-dark', textColor: 'text-white' },
    { target: 21, label: 'Years Of Experience', suffix: '+', bgColor: 'bg-dark', numColor: 'text-white', textColor: 'text-white' },
    { target: 97, label: 'Team Members', suffix: '+', bgColor: 'bg-primary', numColor: 'text-dark', textColor: 'text-white' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Listen for navigation back to this route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        const video = this.videoPlayer?.nativeElement;
        if (video) {
          video.currentTime = 0; // restart from beginning if needed
          video.muted = true; // ensure autoplay works
          video.play().catch(err => console.warn('Replay failed:', err));
        }
      });
  }

  ngAfterViewInit(): void {
    const video = this.videoPlayer.nativeElement;
    video.muted = true; // browsers require muted autoplay
    video.play().catch(err => console.warn('Initial autoplay blocked:', err));
  }

  animateCount(element: HTMLElement, target: number, duration: number): void {
    let current = 0;
    const intervalTime = 10;
    const increment = target / (duration / intervalTime);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        clearInterval(timer);
        current = target;
      }
      element.textContent = Math.ceil(current).toString();
    }, intervalTime);
  }
}
