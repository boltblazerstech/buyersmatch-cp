package com.buyersmatch.seeder;

import com.buyersmatch.entities.AdminUser;
import com.buyersmatch.repositories.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class AdminUserSeeder implements CommandLineRunner {

    private final AdminUserRepository adminUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String superAdminEmail = "boltblazers.tech@gmail.com";

        if (adminUserRepository.findByEmail(superAdminEmail).isEmpty()) {
            AdminUser superAdmin = AdminUser.builder()
                    .email(superAdminEmail)
                    .passwordHash(passwordEncoder.encode("Krishna?108"))
                    .fullName("BoltBlazers Super Admin")
                    .isSuperAdmin(true)
                    .build();
            adminUserRepository.save(superAdmin);
            log.info("Super Admin user seeded: {}", superAdminEmail);
        } else {
            // Ensure they are marked as super admin if they already exist
            AdminUser existing = adminUserRepository.findByEmail(superAdminEmail).get();
            if (!Boolean.TRUE.equals(existing.getIsSuperAdmin())) {
                existing.setIsSuperAdmin(true);
                adminUserRepository.save(existing);
                log.info("Super Admin user updated: {}", superAdminEmail);
            }
        }

        String adminEmail = "info@buyersmatch.com.au";
        if (adminUserRepository.findByEmail(adminEmail).isEmpty()) {
            AdminUser admin = AdminUser.builder()
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode("bm123"))
                    .fullName("BuyersMatch Admin")
                    .build();
            adminUserRepository.save(admin);
            log.info("Admin user seeded: {}", adminEmail);
        } else {
            log.info("Admin user already exists, skipping seed");
        }
    }
}
