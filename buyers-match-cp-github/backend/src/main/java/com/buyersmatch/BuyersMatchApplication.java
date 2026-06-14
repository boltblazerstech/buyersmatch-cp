package com.buyersmatch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BuyersMatchApplication {
    public static void main(String[] args) {
        SpringApplication.run(BuyersMatchApplication.class, args);
    }
}
