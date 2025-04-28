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
  @Output() stoppedTyping = new EventEmitter<void>();
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
      // When sending a message, also stop typing indicator
      this.stoppedTyping.emit();

      // Clear any typing timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }

      // Send the message
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

    // Only emit typing event if there's actual content
    const message = this.messageForm.get('message')?.value;
    if (message && message.trim().length > 0) {
      // Emit typing event
      console.log('ChatMessageInput: Emitting typing event');
      this.typing.emit();

      // Set timeout to stop typing indicator after 2 seconds of inactivity
      this.typingTimeout = setTimeout(() => {
        // Emit another event to indicate user stopped typing
        // This is handled in the container component
        console.log('ChatMessageInput: Typing timeout - user stopped typing');
        // We need to emit an event to stop typing
        this.stoppedTyping.emit();
      }, 2000);
    } else {
      // If there's no content, stop typing indicator immediately
      console.log('ChatMessageInput: No content - stopping typing indicator');
      this.stoppedTyping.emit();
    }
  }

  /**
   * Handle input blur event (when input loses focus)
   */
  onInputBlur(): void {
    // When the input loses focus, stop typing indicator
    console.log('ChatMessageInput: Input blur - stopping typing indicator');

    // Clear any typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    // Emit stopped typing event
    this.stoppedTyping.emit();
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
