package com.electro.user.service;

import com.electro.user.entity.SalesAssignCursor;
import com.electro.user.entity.User;
import com.electro.user.repository.SalesAssignCursorRepository;
import com.electro.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SalesAutoAssignService {

    private final UserRepository userRepository;
    private final SalesAssignCursorRepository cursorRepository;

    @Transactional
    public Optional<Integer> nextSalesUserId() {
        List<User> sales = userRepository.findActiveSalesUsers();
        if (sales.isEmpty()) {
            return Optional.empty();
        }
        SalesAssignCursor cursor = cursorRepository.findById(1)
                .orElseGet(() -> {
                    SalesAssignCursor c = new SalesAssignCursor();
                    c.setId(1);
                    c.setLastIndex(-1);
                    return cursorRepository.save(c);
                });
        int next = (cursor.getLastIndex() + 1) % sales.size();
        cursor.setLastIndex(next);
        cursorRepository.save(cursor);
        return Optional.of(sales.get(next).getId());
    }

    @Transactional(readOnly = true)
    public List<User> listActiveSalesUsers() {
        return userRepository.findActiveSalesUsers();
    }

    public Optional<String> resolveSalesName(Integer userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return userRepository.findById(userId).map(User::getName);
    }
}
