package com.chat.app.backend.repository;

import com.chat.app.backend.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for Role entity operations.
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    /**
     * Find a role by name.
     *
     * @param name the role name to search for
     * @return an Optional containing the role if found
     */
    Optional<Role> findByName(String name);

    /**
     * Check if a role with the given name exists.
     *
     * @param name the role name to check
     * @return true if the role exists, false otherwise
     */
    boolean existsByName(String name);
}