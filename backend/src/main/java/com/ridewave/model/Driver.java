package com.ridewave.model;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

@Entity
public class Driver extends AppUser {

    private String licenseNo;
    private String vehicleInfo;
}