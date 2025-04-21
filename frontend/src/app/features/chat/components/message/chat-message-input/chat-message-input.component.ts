import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Component for inputting and sending chat messages.
 * Includes typing indicator functionality.
 */
@Component({
  selector: 'chat-message-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './chat-message-input.component.html',
  styleUrls: ['./chat-message-input.component.css']
})
export class ChatMessageInputComponent implements OnInit {
  @Input() disabled = false;
  @Output() messageSent = new EventEmitter<string>();
  @Output() typing = new EventEmitter<void>();
  @ViewChild('inputContainer') inputContainer!: ElementRef;

  messageForm: FormGroup;
  private typingTimeout: any;

  constructor(private formBuilder: FormBuilder) {
    this.messageForm = this.formBuilder.group({
      message: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {}

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.messageForm.invalid || this.disabled) {
      return;
    }

    const message = this.messageForm.value.message.trim();
    if (message) {
      this.messageSent.emit(message);
      this.messageForm.reset({ message: '' });

      // Focus the input field after sending a message
      setTimeout(() => {
        const inputElement = this.inputContainer.nativeElement.querySelector('input');
        if (inputElement) {
          inputElement.focus();
        }
      }, 0);
    }
  }

  /**
   * Handle typing event
   */
  onTyping(): void {
    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Emit typing event
    this.typing.emit();

    // Set timeout to stop typing indicator after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      // You could emit another event here if needed to indicate user stopped typing
    }, 2000);
  }

  /**
   * Handle Enter key press
   * @param event Keyboard event
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
