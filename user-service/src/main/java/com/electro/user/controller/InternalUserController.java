package com.electro.user.controller;

import com.electro.user.dto.GoogleLoginRequest;
import com.electro.user.dto.UserDto;
import com.electro.user.entity.User;
import com.electro.user.exception.BadRequestException;
import com.electro.user.exception.ResourceNotFoundException;
import com.electro.user.repository.UserRepository;
import com.electro.user.repository.AddressRepository;
import com.electro.user.entity.UserAddress;
import com.electro.user.service.UserService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/internal/users")
public class InternalUserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.electro.user.service.GoogleAuthService googleAuthService;

    @PostMapping("/login")
    public Map<String, Object> verifyLogin(@RequestBody Map<String, String> request) {
        String usernameOrEmail = request.get("username");
        if (!StringUtils.hasText(usernameOrEmail)) {
            usernameOrEmail = request.get("usernameOrEmail");
        }
        String password = request.get("password");

        Map<String, Object> response = new HashMap<>();

        if (!StringUtils.hasText(usernameOrEmail) || !StringUtils.hasText(password)) {
            response.put("success", false);
            return response;
        }

        User user = userRepository.findByUsernameOrEmail(usernameOrEmail.trim(), usernameOrEmail.trim())
                .orElse(null);
        if (user != null && passwordEncoder.matches(password, user.getPassword())) {
            return userService.buildAuthSuccessPayload(user);
        }

        response.put("success", false);
        return response;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@Valid @RequestBody UserDto.CreateRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            UserDto.Response created = userService.createUser(request);
            User user = userRepository.findByUsername(created.getUsername())
                    .orElseThrow(() -> new BadRequestException("User not found after register"));
            return userService.buildAuthSuccessPayload(user);
        } catch (BadRequestException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @PostMapping("/google-login")
    public Map<String, Object> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            GoogleIdToken.Payload payload = googleAuthService.verifyToken(request.getIdToken());
            User user = userService.findOrCreateGoogleUser(payload);
            return userService.buildAuthSuccessPayload(user);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    @GetMapping("/addresses/{addressId}")
    public UserAddress getAddressById(@PathVariable("addressId") Integer addressId) {
        return addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAddress", "id", addressId));
    }

    @GetMapping("/{userId}")
    public UserDto.Response getUserById(@PathVariable("userId") Integer userId) {
        return userService.getUserById(userId);
    }

    @GetMapping("/username/{username}")
    public UserDto.Response getUserByUsername(@PathVariable("username") String username) {
        return userService.getUserByUsername(username);
    }
}
