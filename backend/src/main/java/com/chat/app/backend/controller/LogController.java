package com.chat.app.backend.controller;


import com.chat.app.backend.dto.log.LogRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for frontend logs endpoints.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/logs")
public class LogController {

    private static final Logger logger = LoggerFactory.getLogger(LogController.class);


    /**
     * sending log to api.
     *
     * @param logRequest the api log request containing frontend log details
     * @return success message if log pushed successful, error message otherwise
     */
    @PostMapping("/log")
    public ResponseEntity<?> apiLogs(@Valid @RequestBody LogRequest logRequest) {
        logger.info("frontend log request {} ",logRequest);
        return ResponseEntity.ok("success");
    }
}
