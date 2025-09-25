package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.model.EnergyData;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class IntegrationAlgorithmTest {

    @Test
    public void integratesConstantPowerExactly() throws Exception {
        // Build readings: 0s -> 3600s, constant 1000 W gen, 500 W cons
        List<EnergyData> readings = new ArrayList<>();
        readings.add(make(1000, 500, LocalDateTime.of(2025, 1, 1, 0, 0, 0)));
        readings.add(make(1000, 500, LocalDateTime.of(2025, 1, 1, 1, 0, 0)));

        Method m = EnergyDataServiceImpl.class.getDeclaredMethod("integrateEnergy", List.class);
        m.setAccessible(true);
        double[] res = (double[]) m.invoke(null, readings);

        // 1 kW for 1 h = 1.0 kWh, 0.5 kW for 1 h = 0.5 kWh
        Assertions.assertEquals(1.0, res[0], 1e-6);
        Assertions.assertEquals(0.5, res[1], 1e-6);
    }

    @Test
    public void integratesVariablePowerTrapezoid() throws Exception {
        // 0s: 0 W -> 1800s: 2000 W -> 3600s: 0 W (triangle). Expected area = 0.5 * base(1h) * height(2kW) = 1.0 kWh / 2 = 1.0 kWh? Actually two triangles: up and down combined equals rectangle? We'll rely on algorithm: should be ~1.0 kWh overall gen.
        List<EnergyData> readings = new ArrayList<>();
        readings.add(make(0, 0, LocalDateTime.of(2025, 1, 1, 0, 0, 0)));
        readings.add(make(2000, 0, LocalDateTime.of(2025, 1, 1, 0, 30, 0)));
        readings.add(make(0, 0, LocalDateTime.of(2025, 1, 1, 1, 0, 0)));

        Method m = EnergyDataServiceImpl.class.getDeclaredMethod("integrateEnergy", List.class);
        m.setAccessible(true);
        double[] res = (double[]) m.invoke(null, readings);

        // The average over hour is 1000 W -> 1.0 kWh
        Assertions.assertEquals(1.0, res[0], 1e-6);
    }

    private static EnergyData make(double genW, double conW, LocalDateTime ts) {
        EnergyData d = new EnergyData();
        d.setPowerGenerationWatts(genW);
        d.setPowerConsumptionWatts(conW);
        d.setTimestamp(ts);
        return d;
    }
}

