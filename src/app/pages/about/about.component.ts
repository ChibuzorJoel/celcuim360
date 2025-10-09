import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit, AfterViewInit {

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