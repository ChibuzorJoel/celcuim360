
 import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef } from '@angular/core';

//

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {

  
  @ViewChildren('counterValue') counterValues!: QueryList<ElementRef>;
  
  // Data for the counters to simplify the HTML
  counterData = [
    { target: 32, label: 'Project Complete', suffix: 'k+', bgColor: 'bg-primary', numColor: 'text-dark', textColor: 'text-white' },
    { target: 21, label: 'Years Of Experience', suffix: '+', bgColor: 'bg-dark', numColor: 'text-white', textColor: 'text-white' },
    { target: 97, label: 'Team Members', suffix: '+', bgColor: 'bg-primary', numColor: 'text-dark', textColor: 'text-white' }
  ];

 

  constructor() { }

  ngOnInit(): void {
    // Initialization logic for data, if any
  }

  ngAfterViewInit(): void {
    // ----------------------------------------------------
    // Testimonial Carousel Initialization
    // ----------------------------------------------------
    // FIX: Access jQuery via (window as any).$
   // In home.component.ts inside ngAfterViewInit()

// FIX: Access jQuery via (window as any).$
const $ = (window as any).$; 

// Check if jQuery/Owl Carousel are available before initializing
if ($ && $.fn.owlCarousel) {
    $('.project-carousel').owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: false,
        dots: true,
        loop: true,
        margin: 25, // Space between items
        
        navText: [ 
            '<i class="bi bi-arrow-left"></i>', // Use bi icons or fas icons
            '<i class="bi bi-arrow-right"></i>'
        ],
        responsive: {
            0: {
                items: 1 // Mobile: Show 1 item
            },
            768: {
                items: 2 // Tablet/Desktop: Show 2 items
            }
        }
    });

    // ... your existing testimonial carousel initialization ...
}
    // Check if the elements exist before attempting to animate
    if (this.counterValues) {
      this.counterValues.forEach((el: ElementRef, index: number) => {
        // Ensure the element is visible on the screen before starting the count
        // For simplicity, we just run the animation immediately here. 
        // For production, consider using the Intersection Observer API.
        this.animateCount(el.nativeElement, this.counterData[index].target, 2000); // 2000ms = 2 seconds
      });
    }
  }
 

  // Angular-native animation function
  animateCount(element: HTMLElement, target: number, duration: number): void {
    let current = 0;
    // We use a small, fixed time interval (10ms)
    const intervalTime = 10;
    // Calculate the amount to add in each interval
    const increment = target / (duration / intervalTime); 
    
    const timer = setInterval(() => {
      current += increment;
      
      if (current >= target) {
        clearInterval(timer);
        current = target;
      }
      
      // Use Math.ceil() to ensure the number always increases and reaches the final target cleanly.
      element.textContent = Math.ceil(current).toString();
      
    }, intervalTime);
  }

}