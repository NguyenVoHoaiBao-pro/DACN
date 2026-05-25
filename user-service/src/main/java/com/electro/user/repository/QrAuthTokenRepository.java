package com.electro.user.repository;

import com.electro.user.entity.QrAuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface QrAuthTokenRepository extends JpaRepository<QrAuthToken, Long> {

    Optional<QrAuthToken> findByTokenAndExpiryDateAfter(String token, LocalDateTime now);

    Optional<QrAuthToken> findByToken(String token);
}

