package com.solar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SolarApplication {

	public static void main(String[] args) {
		SpringApplication.run(SolarApplication.class, args);
	}

}
